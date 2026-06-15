/* Application Logic: E-Learning Platform - V4 Vietnamese Only, AI Content & Bright Mode */

// Global State
const state = {
  currentSlideIndex: 0,
  maxVisitedIndex: 0,
  completedSlides: new Set(),
  quizAnswers: {}, // index -> Array of chosenOptionIndexes
  quizSubmitted: {}, // index -> true/false
  sortingGamePlacements: {}, // cardId -> bucketName ('left' | 'right')
  sortingGameChecked: false,
  selectedCardId: null,
  selectedOptionIndexes: [], // Temporary array for multi-select quiz choices
  collapsedSectionIndex: null
};

// SCORM 1.2 Connection API
const SCORM = {
  api: null,
  active: false,

  findAPI(win) {
    let findAttempts = 0;
    const maxAttempts = 10;
    try {
      while (win.API === undefined && win.parent !== undefined && win.parent !== win && findAttempts < maxAttempts) {
        findAttempts++;
        win = win.parent;
      }
      return win.API;
    } catch (e) {
      // Cross-origin parent (e.g. preview/sandbox) — fall back to standalone mode
      return undefined;
    }
  },

  init() {
    try {
      this.api = this.findAPI(window);
      if (!this.api && window.opener) {
        this.api = this.findAPI(window.opener);
      }
    } catch (e) {
      this.api = null;
    }
    
    if (this.api) {
      const result = this.api.LMSInitialize("");
      this.active = (result === "true");
      console.log("SCORM 1.2 initialized status:", this.active);
      
      const status = this.api.LMSGetValue("cmi.core.lesson_status");
      if (status === "not attempted" || status === "") {
        this.api.LMSSetValue("cmi.core.lesson_status", "incomplete");
        this.api.LMSCommit("");
      }
    } else {
      console.warn("LMS SCORM API not found. Running in standalone local mode.");
    }
  },

  getBookmark() {
    if (this.active && this.api) {
      const loc = this.api.LMSGetValue("cmi.core.lesson_location");
      if (loc && !isNaN(loc)) {
        return parseInt(loc);
      }
    }
    return null;
  },

  setBookmark(slideIdx) {
    if (this.active && this.api) {
      this.api.LMSSetValue("cmi.core.lesson_location", slideIdx.toString());
      this.api.LMSCommit("");
    }
  },

  reportScore(score, max) {
    if (this.active && this.api) {
      const rawScore = score.toString();
      this.api.LMSSetValue("cmi.core.score.raw", rawScore);
      this.api.LMSSetValue("cmi.core.score.max", max.toString());
      this.api.LMSSetValue("cmi.core.score.min", "0");
      
      const pct = (score / max) * 100;
      const status = (pct >= 75) ? "passed" : "failed";
      this.api.LMSSetValue("cmi.core.lesson_status", status);
      
      this.api.LMSCommit("");
      console.log(`SCORM Score reported: ${score}/${max} (${status})`);
    }
  },

  setCompleted() {
    if (this.active && this.api) {
      const status = this.api.LMSGetValue("cmi.core.lesson_status");
      if (status !== "passed" && status !== "failed") {
        this.api.LMSSetValue("cmi.core.lesson_status", "completed");
        this.api.LMSCommit("");
      }
    }
  },

  terminate() {
    if (this.active && this.api) {
      this.api.LMSFinish("");
      this.active = false;
      console.log("SCORM 1.2 terminated.");
    }
  }
};

// Section Outline definition (Vietnamese sentence case)
const sections = [
  { id: 'sec-intro', title: 'Giới thiệu chủ đề', hideSubsections: true },
  { id: 'sec-part1', title: 'Phần 1: Tổng quan về AI và GenAI' },
  { id: 'sec-part2', title: 'Phần 2: Kỹ thuật viết prompt hiệu quả' },
  { id: 'sec-part3', title: 'Phần 3: Nguyên tắc đạo đức và trách nhiệm khi ứng dụng AI trong trường học' },
  { id: 'sec-quiz', title: 'Phần 4: Đánh giá và tổng kết', hideSubsections: true },
  { id: 'sec-next', title: 'Workshop trực tuyến nâng cao – Chủ đề 1', hideSubsections: true, alwaysUnlocked: true }
];

// Content Slide Dictionary (Vietnamese sentence case)
const slides = [
  // SECTION 0: INTRO
  {
    id: 'intro-welcome',
    sectionIndex: 0,
    type: 'intro',
    title: 'Nội dung chính',
    coverImage: '../home_ws1.png',
    content: `
      <div style="max-width:780px; margin: 0 auto;">
        <p style="font-size:1.05rem; margin-bottom:1.75rem; line-height:1.75; text-align:center;"><strong>Chủ đề 1 – Tổng quan và các phương thức ứng dụng AI hiệu quả cho nhà giáo</strong> sẽ trình bày cho thầy cô bức tranh tổng quan về trí tuệ nhân tạo và các phương thức ứng dụng AI hiệu quả trong bối cảnh giáo dục hiện đại. Thầy cô sẽ được trang bị nền tảng kiến thức vững chắc về AI, xây dựng kỹ năng đặt câu lệnh (prompt engineering) để khai thác tối đa tiềm năng của các công cụ AI, đồng thời nắm vững các nguyên tắc đạo đức, bảo mật và sử dụng công nghệ có trách nhiệm trong môi trường nhà trường.</p>

        <div style="border-top: 1px solid var(--line); padding-top: 1.25rem; margin-bottom: 1.25rem;">
          <p style="font-size:0.78rem; font-weight:700; text-transform:uppercase; letter-spacing:0.07em; color:var(--ink-3); margin-bottom:0.85rem;">Mục tiêu chủ đề</p>
          <div style="display:flex; gap:1rem; flex-wrap:wrap;">
            <div style="flex:1; min-width:180px; display:flex; align-items:flex-start; gap:0.65rem; background:var(--bg-soft); border-radius:var(--border-radius-md); padding:0.85rem 1rem;">
              <span style="font-size:1.35rem; line-height:1; flex-shrink:0;">🧠</span>
              <div>
                <div style="font-size:0.82rem; font-weight:700; color:var(--brand); margin-bottom:0.2rem;">Nhận thức</div>
                <div style="font-size:0.82rem; color:var(--ink-2); line-height:1.45;">Phân biệt AI truyền thống & AI tạo sinh, hiểu cơ chế dự báo ngôn ngữ và hiện tượng ảo tưởng của AI.</div>
              </div>
            </div>
            <div style="flex:1; min-width:180px; display:flex; align-items:flex-start; gap:0.65rem; background:var(--bg-soft); border-radius:var(--border-radius-md); padding:0.85rem 1rem;">
              <span style="font-size:1.35rem; line-height:1; flex-shrink:0;">🛠️</span>
              <div>
                <div style="font-size:0.82rem; font-weight:700; color:var(--brand); margin-bottom:0.2rem;">Kỹ năng</div>
                <div style="font-size:0.82rem; color:var(--ink-2); line-height:1.45;">Nắm vững kỹ thuật viết prompt: Cấu trúc 5 yếu tố, nhập vai, zero-shot và prompt đảo ngược.</div>
              </div>
            </div>
            <div style="flex:1; min-width:180px; display:flex; align-items:flex-start; gap:0.65rem; background:var(--bg-soft); border-radius:var(--border-radius-md); padding:0.85rem 1rem;">
              <span style="font-size:1.35rem; line-height:1; flex-shrink:0;">🏫</span>
              <div>
                <div style="font-size:0.82rem; font-weight:700; color:var(--brand); margin-bottom:0.2rem;">Ứng dụng</div>
                <div style="font-size:0.82rem; color:var(--ink-2); line-height:1.45;">Thực hành soạn giáo án, thiết kế slide tự động với Gamma và lên ý tưởng mô phỏng trực quan học tập.</div>
              </div>
            </div>
          </div>
        </div>

        <p style="text-align:center; color:var(--ink-3); font-size:0.85rem;"><strong>Thời lượng dự kiến:</strong> ~45 phút (30 phút video · 3 hoạt động)</p>
      </div>
    `
  },
  
  // SECTION 1: OVERVIEW OF AI & GENAI
  {
    id: 'p1-video',
    sectionIndex: 1,
    type: 'video',
    title: 'AI là gì?',
    videoUrl: 'https://www.youtube-nocookie.com/embed/ucVuMgd3NEM',
    content: `
      <div class="info-card" style="border-left: 4px solid var(--rmit-red); background-color: var(--bg-soft); padding: 1.25rem; border-radius: var(--border-radius-md); max-width: 720px; margin: 1.5rem auto 0; box-shadow: var(--shadow-sm);">
        <h4 style="color: var(--ink); margin-bottom: 0.75rem; font-weight: 700; font-size: 1.05rem;">Tóm tắt</h4>
        <ul class="bullet-list" style="margin-top: 0; padding-left: 0; font-size: 0.95rem;">
          <li><strong>Trí tuệ nhân tạo</strong> (AI): Các hệ thống máy tính có trí tuệ để thực thi tác vụ phức tạp của con người.</li>
          <li><strong>Học máy</strong> (Machine Learning): Phân nhánh AI cho phép máy tự học hỏi, tối ưu hóa hiệu quả từ dữ liệu.</li>
          <li><strong>AI tạo sinh</strong> (Generative AI): Phân nhánh học sâu sử dụng mô hình xác suất thống kê lớn để tự động sáng tạo nội dung mới (ảnh, nhạc, văn bản...) dựa trên prompt.</li>
        </ul>
      </div>
    `
  },
  {
    id: 'p1-traditional-vs-genai',
    sectionIndex: 1,
    type: 'text',
    title: 'So sánh AI và GenAI',
    content: `
      <div class="grid-2col" style="align-items: stretch;">
        <div class="info-card" style="display: flex; flex-direction: column; height: 100%; border-left: 4px solid var(--accent-emerald); background-color: #ffffff;">
          <h3 style="color:var(--accent-emerald); margin-bottom: 0.5rem; font-size: 1.1rem;">AI truyền thống (Traditional AI)</h3>
          <p style="margin-bottom: 0.5rem; color:var(--ink); font-weight:500;">Phân tích thông tin để đưa ra quyết định, phân loại hoặc dự báo.</p>
          <ul class="bullet-list" style="font-size:0.9rem; flex-grow: 1;">
            <li>Hoạt động dựa trên quy tắc định sẵn hoặc học máy (Machine Learning) truyền thống.</li>
            <li>Phân tích dữ liệu lịch sử để tìm quy luật (dự báo thời tiết, phát hiện giao dịch gian lận).</li>
            <li>Thực hiện phân loại và nhận diện tốt (lọc thư rác, nhận dạng khuôn mặt).</li>
            <li>Không tự tạo ra nội dung mới, chỉ phản hồi thông tin dựa trên dữ liệu sẵn có.</li>
          </ul>
        </div>
        <div class="info-card" style="display: flex; flex-direction: column; height: 100%; border-left: 4px solid var(--accent-purple); background-color: #ffffff;">
          <h3 style="color:var(--accent-purple); margin-bottom: 0.5rem; font-size: 1.1rem;">AI tạo sinh (Generative AI)</h3>
          <p style="margin-bottom: 0.5rem; color:var(--ink); font-weight:500;">Tự động sáng tạo và sinh ra các nội dung hoàn toàn mới.</p>
          <ul class="bullet-list" style="font-size:0.9rem; flex-grow: 1;">
            <li>Hoạt động dựa trên mô hình học sâu (Deep Learning) lớn huấn luyện trên dữ liệu quy mô lớn.</li>
            <li>Tự sinh văn bản, thơ ca, kịch bản, âm nhạc hoặc mã nguồn lập trình từ câu lệnh (prompt).</li>
            <li>Thiết kế hình ảnh minh họa, vẽ tranh nghệ thuật và sinh bố cục slide tự động.</li>
            <li>Có khả năng hiểu ngữ cảnh hội thoại và cá nhân hóa phản hồi theo yêu cầu của người dùng.</li>
          </ul>
        </div>
      </div>
    `
  },
  {
    id: 'p1-sorting-game',
    sectionIndex: 1,
    type: 'game-sex-gender', // Map sorting game to this slide type
    title: 'Hoạt động: Phân loại tác vụ AI',
    leftBucketName: 'AI truyền thống',
    rightBucketName: 'AI tạo sinh',
    gameItems: [
      { id: 'item1', label: 'Dự báo thời tiết dựa trên dữ liệu cũ', category: 'left', feedback: 'Dự báo thời tiết là phân tích dữ liệu lịch sử để tìm quy luật (AI truyền thống).' },
      { id: 'item2', label: 'Tự động sáng tác một bài thơ lục bát', category: 'right', feedback: 'Sáng tác bài thơ mới là khả năng tạo sinh văn bản nghệ thuật (AI tạo sinh).' },
      { id: 'item3', label: 'Nhận diện lỗi chính tả trong văn bản', category: 'left', feedback: 'Kiểm tra lỗi dựa trên các quy tắc ngữ pháp và từ điển có sẵn (AI truyền thống).' },
      { id: 'item4', label: 'Lập trình game nhỏ từ câu mô tả', category: 'right', feedback: 'Tạo mã lập trình hoàn toàn mới dựa trên yêu cầu là tác vụ tạo sinh (AI tạo sinh).' },
      { id: 'item5', label: 'Nhận diện khuôn mặt để mở khóa', category: 'left', feedback: 'So sánh hình ảnh thực tế với dữ liệu gương mặt mẫu đã đăng ký (AI truyền thống).' },
      { id: 'item6', label: 'Vẽ tranh minh họa theo mô tả chữ', category: 'right', feedback: 'Sinh ảnh minh họa mới từ mô tả ngôn ngữ tự nhiên (AI tạo sinh).' }
    ]
  },

  // SECTION 2: PROMPT ENGINEERING
  {
    id: 'p2-intro',
    sectionIndex: 2,
    type: 'video',
    title: 'Kỹ thuật viết prompt là gì',
    videoUrl: 'https://www.youtube-nocookie.com/embed/ATt5ZdqszLw',
    content: `
      <div class="info-card" style="border-left: 4px solid var(--rmit-red); background-color: var(--bg-soft); padding: 1.25rem; border-radius: var(--border-radius-md); max-width: 720px; margin: 1.5rem auto 0; box-shadow: var(--shadow-sm);">
        <h4 style="color: var(--ink); margin-bottom: 0.75rem; font-weight: 700; font-size: 1.05rem;">Tóm tắt</h4>
        <ul class="bullet-list" style="margin-top: 0; padding-left: 0; font-size: 0.95rem;">
          <li><strong>Prompt:</strong> Là toàn bộ yêu cầu, bối cảnh và hướng dẫn đầu vào mà thầy cô cung cấp cho mô hình GenAI.</li>
          <li><strong>Prompt Engineering (Kỹ thuật viết prompt):</strong> Kỹ thuật thiết kế và tối ưu hóa câu lệnh nhằm điều khiển AI hoạt động hiệu quả nhất, xuất ra câu trả lời chính xác và chất lượng.</li>
        </ul>
      </div>
    `
  },
  {
    id: 'p2-zero-shot',
    sectionIndex: 2,
    type: 'video',
    title: 'Đăng ký tài khoản chatbot AI và kỹ thuật zero-shot',
    videoUrl: 'https://www.youtube-nocookie.com/embed/vaygFYxpn1I',
    content: `
      <div class="info-card" style="border-left: 4px solid var(--rmit-red); background-color: var(--bg-soft); padding: 1.25rem; border-radius: var(--border-radius-md); max-width: 720px; margin: 1.5rem auto 0; box-shadow: var(--shadow-sm);">
        <h4 style="color: var(--ink); margin-bottom: 0.75rem; font-weight: 700; font-size: 1.05rem;">Tóm tắt</h4>
        <ul class="bullet-list" style="margin-top: 0; padding-left: 0; font-size: 0.95rem;">
          <li><strong>Đăng ký tài khoản AI (ChatGPT, Gemini, Claude...):</strong> Truy cập vào các trang chủ chính thức (như chatgpt.com, gemini.google.com, claude.ai) để tạo tài khoản miễn phí. Quy trình đăng ký bằng email hoặc liên kết tài khoản (Google, Microsoft, Apple) là tương tự nhau cho hầu hết các công cụ AI hiện nay.</li>
          <li><strong>Kỹ thuật Zero-Shot:</strong> Đưa ra yêu cầu trực tiếp cho AI thực hiện mà không cần cung cấp bất kỳ ví dụ mẫu nào trước đó. AI tự động dựa trên tri thức cơ sở có sẵn để trả lời.</li>
        </ul>
      </div>
    `
  },
  {
    id: 'p2-activity',
    sectionIndex: 2,
    type: 'text',
    title: 'Hoạt động: Thực hành đặt câu lệnh',
    content: `
      <div style="font-size: 0.98rem; line-height: 1.7; max-width: 800px; margin: 0 auto;">
        <p style="margin-bottom: 1.25rem;">Thầy cô hãy thực hành đăng ký tài khoản và thử nghiệm câu lệnh (prompt) đầu tiên của mình theo hướng dẫn dưới đây:</p>
        
        <div class="info-card" style="border-left: 4px solid var(--rmit-red); background-color: var(--bg-soft); margin-bottom: 1.5rem;">
          <h4 style="color: var(--brand); margin-bottom: 0.5rem; font-size: 1.05rem;"><strong>Nhiệm vụ thực hành:</strong></h4>
          <ol style="margin-left: 1.5rem; margin-top: 0.5rem; display: flex; flex-direction: column; gap: 0.5rem;">
            <li>Truy cập vào công cụ AI của thầy cô (ChatGPT, Gemini hoặc Claude).</li>
            <li>Sao chép câu lệnh dưới đây và gửi cho AI:</li>
          </ol>
          <div style="background-color: #ffffff; border: 1px dashed var(--line-2); border-radius: var(--border-radius-sm); padding: 1rem; margin-top: 0.85rem; font-style: italic; color: var(--brand);">
            "Tìm cho tôi 3 nguyên nhân chính gây ra ô nhiễm không khí ở các thành phố lớn để sử dụng trong bài giảng thuyết trình lớp học."
          </div>
        </div>

        <h4 style="color: var(--brand); margin-bottom: 0.75rem; font-size: 1.05rem;"><strong>Trải nghiệm khởi động (Warm-up):</strong></h4>
        <p style="margin-bottom: 0.5rem;">Sau khi nhận được câu trả lời từ AI, thầy cô hãy tự xem qua kết quả và cảm nhận (hoạt động trải nghiệm tự do, không có đúng hay sai):</p>
        <ul class="bullet-list" style="margin-top: 0.25rem;">
          <li>Thầy cô thấy câu trả lời của AI đã đáp ứng tốt mong đợi của mình hay chưa?</li>
          <li>Thầy cô có cảm giác nội dung này hơi chung chung và cần phải bổ sung gì thêm để hấp dẫn hơn không?</li>
        </ul>
        <p style="margin-top: 1.25rem; color: var(--ink-3); font-style: italic;">*Gợi ý: Nếu kết quả chưa thực sự tốt cũng không sao. Thầy cô hãy bấm "Tiếp theo" để cùng học các thành phần tạo nên một prompt hiệu quả ở phần kế tiếp, rồi sau đó chúng ta sẽ thử tối ưu hóa lại câu lệnh này nhé!</p>
      </div>
    `
  },
  {
    id: 'p2-advanced-techniques',
    sectionIndex: 2,
    type: 'video',
    title: 'Kỹ thuật prompt nâng cao',
    videoUrl: 'https://www.youtube-nocookie.com/embed/qitvBT3UrOs',
    content: `
      <div class="info-card" style="border-left: 4px solid var(--rmit-red); background-color: var(--bg-soft); padding: 1.25rem; border-radius: var(--border-radius-md); max-width: 720px; margin: 1.5rem auto 0; box-shadow: var(--shadow-sm);">
        <h4 style="color: var(--ink); margin-bottom: 0.75rem; font-weight: 700; font-size: 1.05rem;">Tóm tắt</h4>
        <ul class="bullet-list" style="margin-top: 0; padding-left: 0; font-size: 0.95rem;">
          <li><strong>Kỹ thuật nâng cao:</strong> Nhập vai (Roleplay), prompt đảo ngược (Reverse Prompting) và Few-Shot (cung cấp ví dụ mẫu).</li>
          <li><strong>Ứng dụng thực hành:</strong> Thầy cô hãy suy nghĩ về cách ứng dụng kỹ thuật prompt đảo ngược trong thiết kế bài giảng và soạn học liệu của mình (AI tự đặt câu hỏi để lấy thông tin chi tiết từ thầy cô).</li>
        </ul>
      </div>
    `
  },
  {
    id: 'p2-matching-game',
    sectionIndex: 2,
    type: 'game-matching',
    title: 'Hoạt động: Ghép cặp yếu tố Prompt',
    matchingItems: [
      { id: 'm1', text: 'Đóng vai trò như một gia sư giỏi, chia nhỏ và giải thích những vấn đề phức tạp một cách dễ hiểu', correct: 'persona' },
      { id: 'm2', text: 'giải thích quá trình quang hợp', correct: 'task' },
      { id: 'm3', text: 'cho một học sinh 14 tuổi', correct: 'audience' },
      { id: 'm4', text: 'để hỗ trợ chuẩn bị cho kỳ thi sinh học', correct: 'context' },
      { id: 'm5', text: '300 từ, được viết bằng giọng điệu thân thiện và giáo dục', correct: 'constraints' }
    ],
    components: [
      { value: 'persona', text: 'Nhân vật (Persona) - Yêu cầu AI nhập vai' },
      { value: 'task', text: 'Mục tiêu (Task) - Thầy cô muốn AI làm gì' },
      { value: 'audience', text: 'Đối tượng (Audience) - Đối tượng hướng tới' },
      { value: 'context', text: 'Bối cảnh (Context) - Diễn ra trong bối cảnh nào' },
      { value: 'constraints', text: 'Giới hạn (Constraints) - Cung cấp chỉ dẫn và giới hạn' }
    ]
  },
  // SECTION 3: RESPONSIBLE AI AND ETHICS
  {
    id: 'p3-limitations',
    sectionIndex: 3,
    type: 'grid',
    title: 'Giới hạn và quan ngại của công nghệ AI',
    cards: [
      {
        title: 'Giới hạn dữ liệu huấn luyện',
        desc: 'Mô hình AI bị giới hạn bởi dữ liệu được huấn luyện: thiếu thông tin cập nhật mới nhất, dữ liệu có thể bị thiên vị, thiếu thông tin về địa phương, hoặc bị hạn chế khi dịch thuật và xử lý các ngôn ngữ không phải tiếng Anh.'
      },
      {
        title: 'Tính riêng tư và bảo mật thông tin',
        desc: 'Nguy cơ lộ lọt thông tin cá nhân và dữ liệu nhạy cảm của học sinh cũng như nhà trường khi nhập liệu vào hệ thống AI mà không có các biện pháp bảo mật hoặc kiểm soát dữ liệu phù hợp.'
      },
      {
        title: 'Quan ngại về đạo đức và lứa tuổi',
        desc: 'Sử dụng công cụ AI thiếu trách nhiệm có thể ảnh hưởng đến tính trung thực trong học tập. Ngoài ra, các phản hồi của AI có thể chứa nội dung chưa được kiểm duyệt hoặc chưa phù hợp với lứa tuổi học sinh.'
      }
    ]
  },
  {
    id: 'p3-hallucination',
    sectionIndex: 3,
    type: 'text',
    title: 'Đánh giá câu trả lời từ AI',
    content: `
      <div class="grid-2col" style="align-items: center;">
        <!-- Left Column: Responsive SVG Flowchart Diagram representing correct loops -->
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 1.5rem; background: var(--bg-softer); border: 1px solid var(--line); border-radius: var(--border-radius-lg); height: 100%; box-shadow: var(--shadow-sm); box-sizing: border-box; width: 100%;">
          <div style="font-weight: 700; color: var(--brand); margin-bottom: 0.75rem; text-transform: uppercase; font-size: 0.8rem; letter-spacing: 0.05em;">Chu trình tương tác AI</div>
          <svg width="100%" height="210" viewBox="0 0 400 210" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: block; margin: 0 auto; max-width: 380px;">
            <defs>
              <marker id="arrow-blue" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1.5 L 7 5 L 0 8.5 z" fill="#000054" />
              </marker>
              <marker id="arrow-red" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1.5 L 7 5 L 0 8.5 z" fill="#E61E2A" />
              </marker>
            </defs>

            <!-- Connector arrows -->
            <path d="M 145 47 L 172 47" stroke="#000054" stroke-width="2" marker-end="url(#arrow-blue)" />
            <path d="M 260 47 L 287 47" stroke="#000054" stroke-width="2" marker-end="url(#arrow-blue)" />
            <path d="M 340 70 L 340 112" stroke="#000054" stroke-width="2" marker-end="url(#arrow-blue)" />
            <path d="M 140 157 C 25 157, 25 47, 57 47" stroke="#E61E2A" stroke-width="2" stroke-dasharray="4,3" marker-end="url(#arrow-red)" />

            <!-- Node items as foreignObjects -->
            <foreignObject x="65" y="25" width="80" height="44">
              <div style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; background: #ffffff; border: 1.5px solid var(--line-2); border-radius: 8px; font-family: inherit; font-size: 0.8rem; font-weight: 600; color: var(--brand); text-align: center; box-shadow: var(--shadow-sm); box-sizing: border-box;">
                Prompt
              </div>
            </foreignObject>

            <foreignObject x="180" y="25" width="80" height="44">
              <div style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; background: var(--brand); border-radius: 8px; font-family: inherit; font-size: 0.8rem; font-weight: 600; color: #ffffff; text-align: center; box-shadow: var(--shadow-sm); box-sizing: border-box;">
                Mô hình AI
              </div>
            </foreignObject>

            <foreignObject x="295" y="25" width="90" height="44">
              <div style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; background: #ffffff; border: 1.5px solid var(--line-2); border-radius: 8px; font-family: inherit; font-size: 0.8rem; font-weight: 600; color: var(--brand); text-align: center; box-shadow: var(--shadow-sm); box-sizing: border-box;">
                Đầu ra
              </div>
            </foreignObject>

            <foreignObject x="140" y="120" width="245" height="74">
              <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100%; height: 100%; background: var(--accent-tint); border: 1.5px solid var(--accent); border-radius: var(--border-radius-md); padding: 0.5rem 0.75rem; text-align: center; box-shadow: var(--shadow-sm); font-family: inherit; box-sizing: border-box;">
                <div style="font-weight: 700; color: var(--accent); font-size: 0.85rem; line-height: 1.2;">Kiểm tra / Điều chỉnh</div>
                <div style="font-size: 0.72rem; color: var(--ink-2); margin-top: 0.2rem; line-height: 1.3;">Đối chiếu thông tin &amp; viết lại prompt để tinh chỉnh kết quả</div>
              </div>
            </foreignObject>
          </svg>
        </div>

        <!-- Right Column: Visual bullet list matching the reference image -->
        <div style="display: flex; flex-direction: column; gap: 1.25rem; justify-content: center; height: 100%;">
          <div style="display: flex; gap: 0.85rem; align-items: flex-start;">
            <span style="font-size: 1.4rem; line-height: 1.2; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.08));">⚠️</span>
            <div>
              <h4 style="color: var(--rmit-blue); margin-bottom: 0.2rem; font-size: 1rem; font-weight: 600;">Ảo tưởng AI (AI Hallucination)</h4>
              <p style="font-size: 0.88rem; line-height: 1.5; color: var(--ink-2);">AI có thể bị ảo tưởng và tự tin cung cấp các câu trả lời hoàn toàn không chính xác hoặc sai lệch thông tin thực tế.</p>
            </div>
          </div>
          <div style="display: flex; gap: 0.85rem; align-items: flex-start;">
            <span style="font-size: 1.4rem; line-height: 1.2; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.08));">💡</span>
            <div>
              <h4 style="color: var(--rmit-blue); margin-bottom: 0.2rem; font-size: 1rem; font-weight: 600;">Tư duy phản biện (Critical thinking)</h4>
              <p style="font-size: 0.88rem; line-height: 1.5; color: var(--ink-2);">Luôn sử dụng kiến thức chuyên môn và tư duy phản biện của chính thầy cô để đánh giá và thẩm định kỹ câu trả lời từ AI.</p>
            </div>
          </div>
          <div style="display: flex; gap: 0.85rem; align-items: flex-start;">
            <span style="font-size: 1.4rem; line-height: 1.2; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.08));">🔍</span>
            <div>
              <h4 style="color: var(--rmit-blue); margin-bottom: 0.2rem; font-size: 1rem; font-weight: 600;">Kiểm tra chéo nguồn tin</h4>
              <p style="font-size: 0.88rem; line-height: 1.5; color: var(--ink-2);">Chủ động đối chiếu và xác minh lại nội dung do AI đề xuất với sách giáo khoa hoặc các tài liệu chính thống khác.</p>
            </div>
          </div>
        </div>
      </div>
    `
  },
  {
    id: 'p3-responsible-ai',
    sectionIndex: 3,
    type: 'video',
    title: 'Sử dụng AI có trách nhiệm',
    videoUrl: 'https://www.youtube-nocookie.com/embed/-drv2WbMR6A',
    content: `
      <div class="info-card" style="border-left: 4px solid var(--rmit-red); background-color: var(--bg-soft); padding: 1.25rem; border-radius: var(--border-radius-md); max-width: 720px; margin: 1.5rem auto 0; box-shadow: var(--shadow-sm);">
        <h4 style="color: var(--ink); margin-bottom: 0.75rem; font-weight: 700; font-size: 1.05rem;">Tóm tắt</h4>
        <ul class="bullet-list" style="margin-top: 0; padding-left: 0; font-size: 0.95rem;">
          <li><strong>Đạo đức và trách nhiệm:</strong> Khi ứng dụng AI trong học đường, giáo viên cần đề cao tính trung thực học thuật, bảo mật thông tin học sinh, và tính an toàn dữ liệu.</li>
          <li><strong>Nguyên tắc cốt lõi:</strong> AI chỉ đóng vai trò hỗ trợ, không thể thay thế năng lực sư phạm và sự tương tác trực tiếp của nhà giáo. Luôn khuyến khích học sinh sử dụng AI lành mạnh và sáng tạo.</li>
        </ul>
      </div>
    `
  },

  // SECTION 4: QUIZ & SUMMARY
  {
    id: 'quiz-start',
    sectionIndex: 4,
    type: 'text',
    title: 'Bài kiểm tra trắc nghiệm củng cố',
    content: `
      <div style="text-align:center; padding: 2rem;">
        <h3 style="margin-bottom:1rem; color:var(--ink);">Thầy cô đã sẵn sàng thực hiện bài kiểm tra ngắn?</h3>
        <div style="display:flex; justify-content:center;">
          <button class="btn-pill-submit" id="btn-start-quiz-now">Bắt đầu ngay</button>
        </div>
      </div>
    `
  },
  {
    id: 'quiz-q1',
    sectionIndex: 4,
    type: 'quiz',
    questionIndex: 0,
    title: 'Những đặc tính nào dưới đây phản ánh đặc điểm của AI tạo sinh (GenAI)? (Chọn các phương án phù hợp)',
    options: [
      'Có khả năng tự động sáng tạo nội dung mới (văn bản, hình ảnh, slide...) dựa trên dữ liệu đã học.',
      'Hoạt động dựa trên câu lệnh (prompt) đầu vào của người dùng.',
      'Không bao giờ cung cấp thông tin sai lệch hay bị lỗi ảo tưởng.',
      'Dự đoán từ hoặc token tiếp theo dựa trên mô hình xác suất thống kê.'
    ],
    isMultiSelect: true,
    correctAnswers: [0, 1, 3],
    explanation: 'AI tạo sinh tự động sáng tạo nội dung mới dựa trên xác suất đoán từ kế tiếp từ câu lệnh prompt. AI tạo sinh vẫn có thể cung cấp thông tin sai lệch (hiện tượng ảo tưởng).'
  },
  {
    id: 'quiz-q2',
    sectionIndex: 4,
    type: 'quiz',
    questionIndex: 1,
    title: 'Kỹ thuật "Reverse Prompting" (Prompt đảo ngược) trong viết câu lệnh là gì?',
    options: [
      'Viết prompt bằng tiếng Anh rồi dịch ngược lại tiếng Việt để AI dễ hiểu.',
      'Yêu cầu AI đặt câu hỏi ngược lại hoặc tự viết câu lệnh tốt nhất để đạt mục tiêu mong muốn.',
      'Xóa bỏ hoàn toàn ngữ cảnh và vai trò để AI tự do phản hồi.'
    ],
    isMultiSelect: false,
    correctAnswers: [1],
    explanation: 'Reverse Prompting là kỹ thuật yêu cầu AI tự tạo prompt hoặc đặt câu hỏi ngược lại cho người dùng nhằm lấy đủ dữ kiện để viết prompt tối ưu.'
  },
  {
    id: 'quiz-q3',
    sectionIndex: 4,
    type: 'quiz',
    questionIndex: 2,
    title: 'Những thành tố nào dưới đây cấu thành nên một prompt tốt? (Chọn tất cả các phương án đúng)',
    options: [
      'Nhân vật (Persona)',
      'Mục tiêu / Nhiệm vụ (Task)',
      'Đối tượng (Audience)',
      'Bối cảnh (Context)',
      'Giới hạn (Constraints)',
      'Tắt kết nối Internet của AI'
    ],
    isMultiSelect: true,
    correctAnswers: [0, 1, 2, 3, 4],
    explanation: '5 thành tố cốt lõi cấu thành nên một prompt tốt bao gồm: Nhân vật (Persona), Mục tiêu (Task), Đối tượng (Audience), Bối cảnh (Context) và Giới hạn (Constraints).'
  },
  {
    id: 'quiz-q4',
    sectionIndex: 4,
    type: 'quiz',
    questionIndex: 3,
    title: 'Khi phát hiện một thông tin do AI trả lời có vẻ hợp lý nhưng không chắc chắn, giáo viên nên làm gì?',
    options: [
      'Sử dụng ngay lập tức cho bài học vì AI luôn thông minh hơn con người.',
      'Hủy bài giảng đó đi và không dạy nội dung đó nữa.',
      'Sử dụng tư duy phản biện, đối chiếu lại bằng sách giáo khoa hoặc các nguồn tài liệu chính thống đáng tin cậy.'
    ],
    isMultiSelect: false,
    correctAnswers: [2],
    explanation: 'Giáo viên cần giữ vững tư duy phản biện, đối chiếu mọi thông tin của AI với các nguồn dữ liệu tin cậy và sách giáo khoa trước khi mang bài giảng lên lớp.'
  },
  {
    id: 'quiz-score-summary',
    sectionIndex: 4,
    type: 'summary',
    title: 'Kết quả bài kiểm tra'
  },
  {
    id: 'quiz-next-steps',
    sectionIndex: 5,
    type: 'text-image',
    title: 'Workshop trực tuyến nâng cao – Chủ đề 1',
    imagePath: 'youtube_ws1.png',
    content: `
      <div style="font-size: 0.98rem; line-height: 1.7;">
        <p style="margin-bottom: 1.25rem;">Sau khi hoàn thành Chủ đề 1 trên nền tảng TEMIS, thầy cô được mời tham gia buổi workshop trực tuyến nâng cao — nơi chúng ta cùng tiếp tục thảo luận nâng cao thực hành, đặt câu hỏi và chia sẻ kinh nghiệm trong chủ đề này.</p>

        <div class="info-card" style="border-left: 4px solid var(--accent); background-color: var(--bg-soft); padding: 1.25rem; margin-bottom: 1.5rem;">
          <h4 style="color: var(--brand); margin-bottom: 0.5rem; font-size: 1.05rem;"><strong>Thông tin chương trình Workshop 1:</strong></h4>
          <ul class="bullet-list" style="margin-top: 0.5rem; display: flex; flex-direction: column; gap: 0.4rem; padding-left: 0;">
            <li style="padding-left: 1.2rem; margin-bottom: 0;"><strong style="color: var(--brand);">Thời gian:</strong> 14:00 - 15:30</li>
            <li style="padding-left: 1.2rem; margin-bottom: 0;"><strong style="color: var(--brand);">Ngày diễn ra:</strong> 18 tháng 07 năm 2026</li>
            <li style="padding-left: 1.2rem; margin-bottom: 0;"><strong style="color: var(--brand);">Hình thức:</strong> Livestream trực tuyến</li>
          </ul>
        </div>

        <p style="font-style: italic; color: var(--ink-3); margin-top: 1rem;">*Thầy cô có thể sử dụng điện thoại để quét mã QR bên cạnh để truy cập nhanh liên kết livestream YouTube.</p>
      </div>
    `
  }
];

// Helper to translate labels and titles
const UI_STRINGS = {
  btnPrev: 'Trước',
  btnNext: 'Tiếp theo',
  btnResources: 'Tài liệu',
  sidebarTitle: 'Mục lục khóa học',
  drawerTitle: 'Tài liệu học tập và tham khảo',
  progressLabel: 'hoàn thành',
  dragHint: 'Kéo thả các thẻ tác vụ vào đúng cột hoặc nhấn chọn thẻ rồi nhấn chọn cột để di chuyển:',
  dragBucketSex: 'AI truyền thống',
  dragBucketGender: 'AI tạo sinh',
  gameReset: 'Làm lại',
  gameCheck: 'Kiểm tra',
  gameCongratulation: '🎉 Chúc mừng! Thầy cô đã phân loại chính xác tất cả các tác vụ AI!',
  gameErrors: 'Vẫn còn một số tác vụ bị đặt sai cột. Hãy kiểm tra lại!',
  startQuiz: 'Bắt đầu ngay',
  quizFeedbackTitleCorrect: 'Chính xác',
  quizFeedbackTitleIncorrect: 'Chưa chính xác',
  quizBtnSubmit: 'Gửi',
  scoreResult: 'Điểm số của thầy cô:',
  scoreRankGood: 'Tuyệt vời! Thầy cô đã hoàn thành xuất sắc bài kiểm tra! (Đạt)',
  scoreRankAverage: 'Khá tốt! Thầy cô đã hoàn thành bài kiểm tra. (Đạt)',
  scoreRankPoor: 'Kết quả chưa đạt (phải đủ 3/4)<br>Thầy cô vui lòng ôn tập và thực hiện lại nhé!',
  btnResetAll: 'Học lại từ đầu'
};

// Graceful image placeholder when a referenced image file is absent
function imgFallback(img) {
  const name = (img.getAttribute('src') || '').split('/').pop();
  const ph = document.createElement('div');
  ph.className = 'img-ph';
  if (img.classList.contains('slide-cover-image')) ph.classList.add('img-ph-cover');
  ph.innerHTML = `<span class="img-ph-tag">Hình ảnh minh họa</span><span class="img-ph-name">${name}</span>`;
  img.replaceWith(ph);
}
window.imgFallback = imgFallback;

// Initialize DOM Events
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  SCORM.init();
  
  // Check bookmark
  const bookmark = SCORM.getBookmark();
  if (bookmark !== null && bookmark >= 0 && bookmark < slides.length) {
    state.currentSlideIndex = bookmark;
    state.maxVisitedIndex = bookmark;
  }
  
  generateSidebar();
  renderSlide();
});

function setupEventListeners() {
  // Resource drawer controls
  document.getElementById('btn-resources').addEventListener('click', openDrawer);
  document.getElementById('btn-close-drawer').addEventListener('click', closeDrawer);
  document.getElementById('resources-drawer-overlay').addEventListener('click', closeDrawer);

  // Nav buttons
  document.getElementById('btn-prev').addEventListener('click', navigatePrev);
  document.getElementById('btn-next').addEventListener('click', navigateNext);
  
  // Close feedback modal button
  document.getElementById('btn-close-feedback-modal').addEventListener('click', closeFeedbackModal);

  // Mobile sidebar toggle
  const toggleBtn = document.getElementById('btn-sidebar-toggle');
  const scrim = document.getElementById('sidebar-scrim');
  const sidebar = document.getElementById('sidebar');
  if (toggleBtn && scrim && sidebar) {
    toggleBtn.addEventListener('click', () => {
      sidebar.classList.add('active');
      scrim.classList.add('active');
    });
    scrim.addEventListener('click', () => {
      sidebar.classList.remove('active');
      scrim.classList.remove('active');
    });
  }
}

// Close the mobile sidebar (used after navigating via the outline)
function closeMobileSidebar() {
  const sidebar = document.getElementById('sidebar');
  const scrim = document.getElementById('sidebar-scrim');
  if (sidebar) sidebar.classList.remove('active');
  if (scrim) scrim.classList.remove('active');
}

// Section unlocks only when every slide in the preceding section is completed
function isSectionUnlocked(sectionIdx) {
  if (sectionIdx === 0) return true;
  if (sections[sectionIdx]?.alwaysUnlocked) return true;
  const prevSlides = slides.filter(s => s.sectionIndex === sectionIdx - 1);
  return prevSlides.length > 0 && prevSlides.every(s => state.completedSlides.has(s.id));
}

// Generate Outline
function generateSidebar() {
  const outlineList = document.getElementById('outline-list');
  outlineList.innerHTML = '';

  const activeSlide = slides[state.currentSlideIndex];

  sections.forEach((sec, idx) => {
    const li = document.createElement('li');
    li.className = 'nav-section';
    li.id = `nav-sec-${idx}`;
 
    const sectionSlides = slides
      .map((slide, slideIndex) => ({ slide, slideIndex }))
      .filter(item => item.slide.sectionIndex === idx);
    const isActive = activeSlide.sectionIndex === idx;
    const isUnlocked = isSectionUnlocked(idx);
    const hasSubsections = !sec.hideSubsections;
    const isExpanded = hasSubsections && isActive && state.collapsedSectionIndex !== idx;
    const isCompleted = sectionSlides.every(item => state.completedSlides.has(item.slide.id));

    const sectionButton = document.createElement('button');
    sectionButton.type = 'button';
    sectionButton.className = 'nav-item';
    if (isActive) sectionButton.classList.add('active');
    if (isCompleted) sectionButton.classList.add('completed');
    if (!isUnlocked) sectionButton.classList.add('locked');
    sectionButton.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
    sectionButton.setAttribute('aria-controls', `nav-subsections-${idx}`);

    const titleSpan = document.createElement('span');
    titleSpan.className = 'nav-title';
    titleSpan.innerText = sec.title;

    const chevronSpan = document.createElement('span');
    chevronSpan.className = 'nav-chevron';
    chevronSpan.setAttribute('aria-hidden', 'true');
    if (!isUnlocked) {
      chevronSpan.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
        </svg>
      `;
    } else if (hasSubsections) {
      chevronSpan.innerHTML = `
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6 8 10 12 14 8"></polyline>
        </svg>
      `;
    } else {
      chevronSpan.hidden = true;
    }

    const checkSpan = document.createElement('span');
    checkSpan.className = 'nav-check';
    checkSpan.setAttribute('aria-label', isCompleted ? 'Đã hoàn thành' : 'Chưa hoàn thành');
    checkSpan.innerText = isCompleted ? '✓' : '';

    sectionButton.appendChild(titleSpan);
    sectionButton.appendChild(chevronSpan);
    if (isUnlocked) sectionButton.appendChild(checkSpan);

    sectionButton.addEventListener('click', () => {
      if (!isUnlocked) return;

      if (isActive && hasSubsections) {
        state.collapsedSectionIndex = isExpanded ? idx : null;
        generateSidebar();
        return;
      }

      const firstSlideIdx = sectionSlides[0]?.slideIndex ?? -1;
      if (firstSlideIdx !== -1) {
        goToSlide(firstSlideIdx);
      }
    });

    const subsectionList = document.createElement('ul');
    subsectionList.className = 'nav-subsections';
    subsectionList.id = `nav-subsections-${idx}`;
    subsectionList.hidden = !isExpanded;

    const subsectionEntries = [];
    sectionSlides.forEach((item) => {
      if (item.slide.type === 'quiz') {
        const existingQuizEntry = subsectionEntries.find(entry => entry.isQuizGroup);
        if (existingQuizEntry) {
          existingQuizEntry.items.push(item);
        } else {
          subsectionEntries.push({
            isQuizGroup: true,
            label: 'Câu hỏi đánh giá (4 câu)',
            items: [item]
          });
        }
        return;
      }

      subsectionEntries.push({
        isQuizGroup: false,
        label: item.slide.navTitle || item.slide.title,
        items: [item]
      });
    });

    subsectionEntries.forEach((entry, subsectionIndex) => {
      const subsectionItem = document.createElement('li');
      subsectionItem.className = 'nav-subsection-item';

      const subsectionButton = document.createElement('button');
      subsectionButton.type = 'button';
      subsectionButton.className = 'nav-subsection';

      const isSubsectionActive = entry.items.some(
        item => item.slideIndex === state.currentSlideIndex
      );
      const isSubsectionCompleted = entry.items.every(
        item => state.completedSlides.has(item.slide.id)
      );
      if (isSubsectionActive) subsectionButton.classList.add('active');
      if (isSubsectionCompleted) subsectionButton.classList.add('completed');

      const subsectionLabel = document.createElement('span');
      subsectionLabel.className = 'nav-subsection-title';
      subsectionLabel.innerText = entry.label;

      const subsectionCheck = document.createElement('span');
      subsectionCheck.className = 'nav-subcheck';
      subsectionCheck.setAttribute(
        'aria-label',
        isSubsectionCompleted ? 'Đã hoàn thành' : 'Chưa hoàn thành'
      );
      subsectionCheck.innerText = isSubsectionCompleted ? '✓' : '';

      subsectionButton.appendChild(subsectionLabel);
      subsectionButton.appendChild(subsectionCheck);
      subsectionButton.setAttribute(
        'aria-label',
        `${subsectionIndex + 1}. ${entry.label}`
      );

      if (!isUnlocked) subsectionButton.classList.add('locked');

      subsectionButton.addEventListener('click', () => {
        if (!isUnlocked) return;
        goToSlide(entry.items[0].slideIndex);
        closeMobileSidebar();
      });

      subsectionItem.appendChild(subsectionButton);
      subsectionList.appendChild(subsectionItem);
    });

    li.appendChild(sectionButton);
    if (hasSubsections) li.appendChild(subsectionList);
    outlineList.appendChild(li);
  });
  
  // Progress calculations — exclude alwaysUnlocked (workshop) slides
  const trackableSlides = slides.filter(s => !sections[s.sectionIndex]?.alwaysUnlocked);
  const completedTrackable = trackableSlides.filter(s => state.completedSlides.has(s.id)).length;
  const pct = trackableSlides.length ? Math.round(completedTrackable / trackableSlides.length * 100) : 0;
  document.getElementById('progress-percent-label').innerText = `${pct}% ${UI_STRINGS.progressLabel}`;
  document.getElementById('progress-bar-fill-total').style.width = `${pct}%`;
}

// Render dynamic viewport slide content
function renderSlide() {
  const slide = slides[state.currentSlideIndex];
  const viewport = document.getElementById('slide-viewport');
  
  // Update max visited slide index
  state.maxVisitedIndex = Math.max(state.maxVisitedIndex || 0, state.currentSlideIndex);

  // Auto-complete passive slides; interactive types complete only on submit/check
  // Workshop (alwaysUnlocked) slides and quiz-section slides are excluded from individual tracking
  const interactiveTypes = ['game-sex-gender', 'game-matching', 'quiz'];
  const currentSection = sections[slide.sectionIndex];
  const quizSectionIdx = sections.findIndex(sec => sec.id === 'sec-quiz');
  const inQuizSection = slide.sectionIndex === quizSectionIdx;
  if (!currentSection?.alwaysUnlocked && !inQuizSection && !interactiveTypes.includes(slide.type)) {
    state.completedSlides.add(slide.id);
  }
  // When summary is reached, batch-complete all quiz section slides → progress jumps to 100%
  if (slide.type === 'summary') {
    slides.filter(s => s.sectionIndex === quizSectionIdx).forEach(s => {
      state.completedSlides.add(s.id);
    });
  }
  generateSidebar();
  generateIndicators();

  const sec = sections[slide.sectionIndex];
  const eyebrowText = slide.eyebrow || sec.subtitle || sec.title;

  let html = `
    <div class="slide-content" id="slide-${slide.id}">
      <div class="slide-header">
        <span class="slide-eyebrow">${eyebrowText}</span>
        ${slide.type === 'quiz' ? '' : `<h2 class="slide-title">${slide.title}</h2>`}
      </div>
      <div class="slide-body">
  `;

  if (slide.coverImage) {
    html += `
      <img src="${slide.coverImage}" class="slide-cover-image" alt="Cover Image" onerror="imgFallback(this)" />
      <div style="margin-top: 1.5rem;">
        ${slide.content}
      </div>
    `;
  } else {
    if (slide.type === 'intro' || slide.type === 'text') {
      html += slide.content;
    } else if (slide.type === 'grid') {
      html += `<div class="card-grid">`;
      slide.cards.forEach((card, ci) => {
        html += `
          <div class="info-card">
            <div class="info-card-icon">${String(ci + 1).padStart(2, '0')}</div>
            <h4>${card.title}</h4>
            <p>${card.desc}</p>
          </div>
        `;
      });
      html += `</div>`;
    } else if (slide.type === 'video') {
      html += `
        <div class="video-container">
          <iframe src="${slide.videoUrl}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>
        </div>
        <div style="margin-top: 1.5rem;">
          ${slide.content}
        </div>
      `;
    } else if (slide.type === 'text-image') {
      html += `
        <div class="grid-2col" style="align-items: center;">
          <div>
            ${slide.content}
          </div>
          <div style="text-align: center;">
            <img src="${slide.imagePath}" style="width: 100%; max-width: 420px; border-radius: var(--border-radius-md); box-shadow: 0 4px 15px rgba(0,0,0,0.08);" alt="${slide.title}" onerror="imgFallback(this)" />
          </div>
        </div>
      `;
    } else if (slide.type === 'game-sex-gender') {
      html += renderSortingGame(slide);
    } else if (slide.type === 'game-matching') {
      html += renderMatchingGame(slide);
    } else if (slide.type === 'prompt-comparison') {
      html += renderPromptComparisonView(slide);
    } else if (slide.type === 'accordion') {
      html += renderAccordionView(slide);
    } else if (slide.type === 'quiz') {
      html += renderQuizView(slide);
    } else if (slide.type === 'summary') {
      html += renderSummaryView();
    }
  }

  html += `
      </div>
    </div>
  `;

  viewport.innerHTML = html;

  // Setup slide-specific events
  if (slide.type === 'game-sex-gender') {
    setupSortingGameEvents(slide);
  } else if (slide.type === 'game-matching') {
    setupMatchingGameEvents(slide);
  } else if (slide.type === 'accordion') {
    setupAccordionEvents();
  } else if (slide.type === 'quiz') {
    setupQuizEvents(slide);
  } else if (slide.id === 'quiz-start') {
    document.getElementById('btn-start-quiz-now').addEventListener('click', navigateNext);
  } else if (slide.type === 'summary') {
    document.getElementById('btn-retake-quiz').addEventListener('click', retakeQuiz);
  }

  // Update Footer buttons
  document.getElementById('btn-prev').disabled = state.currentSlideIndex === 0;

  // Remove any existing completion buttons before re-evaluating
  const existingCompletionBtns = document.getElementById('completion-btns');
  if (existingCompletionBtns) existingCompletionBtns.remove();

  // Next button is disabled on quiz slides to force submission first
  const nextBtn = document.getElementById('btn-next');
  if (slide.type === 'quiz') {
    nextBtn.style.display = 'none';
  } else if (state.currentSlideIndex === slides.length - 1) {
    nextBtn.style.display = 'none';
    const completionBtns = document.createElement('div');
    completionBtns.id = 'completion-btns';
    completionBtns.style.cssText = 'display:flex; gap:0.75rem; align-items:center;';
    completionBtns.innerHTML = `
      <a href="../index.html" class="btn btn-secondary btn-icon-label" style="text-decoration:none;">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
        <span>Về Trang chủ</span>
      </a>
      <a href="../module2_v1/index.html" class="btn btn-primary btn-icon-label" style="text-decoration:none;">
        <span>Chuyển sang Chủ đề 2</span>
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="5" y1="12" x2="19" y2="12"/>
          <polyline points="12 5 19 12 12 19"/>
        </svg>
      </a>
    `;
    nextBtn.closest('.slide-footer').appendChild(completionBtns);
  } else {
    nextBtn.style.display = 'inline-flex';
    nextBtn.disabled = false;
    document.getElementById('btn-next-text').innerText = UI_STRINGS.btnNext;
  }
}

// Generate indicator dots
function generateIndicators() {
  const container = document.getElementById('step-indicator');
  container.innerHTML = '';
  
  slides.forEach((slide, idx) => {
    const dot = document.createElement('div');
    dot.className = 'step-dot';
    if (idx === state.currentSlideIndex) dot.className += ' active';
    if (state.completedSlides.has(slide.id)) dot.className += ' completed';
    
    dot.addEventListener('click', () => goToSlide(idx));
    container.appendChild(dot);
  });
}

// Accordion Component Renderer
function renderAccordionView(slide) {
  let listHtml = '';
  slide.accordionItems.forEach((item, idx) => {
    listHtml += `
      <div class="accordion-item" id="acc-item-${idx}">
        <div class="accordion-header">
          <span>${item.title}</span>
          <span class="accordion-icon">+</span>
        </div>
        <div class="accordion-body">
          <p>${item.desc}</p>
        </div>
      </div>
    `;
  });

  return `
    <div style="margin-top: 1rem;">
      <h3 style="color:var(--ink); font-weight:600; margin-bottom:0.5rem;">${slide.accordionTitle}</h3>
      <div class="accordion-container">
        ${listHtml}
      </div>
    </div>
  `;
}

function setupAccordionEvents() {
  const headers = document.querySelectorAll('.accordion-header');
  headers.forEach(header => {
    header.addEventListener('click', () => {
      const item = header.parentElement;
      const body = item.querySelector('.accordion-body');
      
      const isActive = item.classList.contains('active');
      
      // Close all accordions first
      document.querySelectorAll('.accordion-item').forEach(i => {
        i.classList.remove('active');
        i.querySelector('.accordion-body').style.maxHeight = null;
      });

      if (!isActive) {
        item.classList.add('active');
        body.style.maxHeight = body.scrollHeight + "px";
      }
    });
  });
}

// Game Template: Generic Left vs Right Sorting Activity
function renderSortingGame(slide) {
  let deckHtml = '';
  slide.gameItems.forEach(item => {
    if (!state.sortingGamePlacements[item.id]) {
      deckHtml += `<div class="drag-card" draggable="true" id="${item.id}">${item.label}</div>`;
    }
  });

  let leftPlaced = '';
  let rightPlaced = '';

  slide.gameItems.forEach(item => {
    const placement = state.sortingGamePlacements[item.id];
    if (placement) {
      const isCorrect = item.category === placement;
      const statusClass = state.sortingGameChecked ? (isCorrect ? 'correct' : 'incorrect') : '';
      const feedbackText = state.sortingGameChecked ? `<span class="placed-card-feedback ${isCorrect ? 'correct' : 'incorrect'}">${isCorrect ? '✓' : '✗'}</span>` : '';

      const cardMarkup = `
        <div class="placed-card ${statusClass}" id="placed-${item.id}">
          <span>${item.label}</span>
          ${feedbackText}
        </div>
      `;

      if (placement === 'left') leftPlaced += cardMarkup;
      if (placement === 'right') rightPlaced += cardMarkup;
    }
  });

  let messageHtml = '';
  if (state.sortingGameChecked) {
    const placedCount = Object.keys(state.sortingGamePlacements).length;
    if (placedCount === 0) {
      messageHtml = `
        <div class="placed-card incorrect" style="margin-top:1rem; padding:1rem; font-weight:600; text-align:center; display:block;">
          Xin mời chuyển cột...
        </div>
      `;
    } else {
      const placedItems = slide.gameItems.filter(item => state.sortingGamePlacements[item.id]);
      const allPlacedCorrect = placedItems.every(item => state.sortingGamePlacements[item.id] === item.category);

      if (!allPlacedCorrect) {
        messageHtml = `
          <div class="placed-card incorrect" style="margin-top:1rem; padding:1rem; font-weight:600; text-align:center; display:block;">
            ${UI_STRINGS.gameErrors}
          </div>
        `;
      } else if (placedCount < slide.gameItems.length) {
        messageHtml = `
          <div class="placed-card correct" style="margin-top:1rem; padding:1rem; font-weight:600; text-align:center; display:block;">
            Các tác vụ đã xếp đều chính xác! Hãy tiếp tục phân loại các thẻ còn lại.
          </div>
        `;
      } else {
        messageHtml = `
          <div class="placed-card correct" style="margin-top:1rem; padding:1rem; font-weight:600; text-align:center; display:block;">
            ${UI_STRINGS.gameCongratulation}
          </div>
        `;
      }
    }
  }

  return `
    <div class="game-container">
      <p class="game-instruction">${UI_STRINGS.dragHint}</p>
      
      <div class="game-arena">
        <div class="drop-zone" id="zone-left" data-zone="left">
          <h4>${slide.leftBucketName}</h4>
          <div class="drop-zone-items" id="items-left">
            ${leftPlaced}
          </div>
        </div>

        <div class="drop-zone" id="zone-right" data-zone="right">
          <h4>${slide.rightBucketName}</h4>
          <div class="drop-zone-items" id="items-right">
            ${rightPlaced}
          </div>
        </div>
      </div>

      <div class="card-deck" id="card-deck">
        ${deckHtml || `<p style="color:var(--text-secondary); font-style:italic;">Tất cả thẻ đã được xếp!</p>`}
      </div>

      ${messageHtml}

      <div class="game-controls">
        <button class="btn btn-secondary" id="btn-game-reset">${UI_STRINGS.gameReset}</button>
        <button class="btn btn-primary" id="btn-game-check">${UI_STRINGS.gameCheck}</button>
      </div>
    </div>
  `;
}

function setupSortingGameEvents(slide) {
  const cards = document.querySelectorAll('.drag-card');
  const zones = document.querySelectorAll('.drop-zone');
  
  cards.forEach(card => {
    card.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', card.id);
      card.classList.add('dragging');
    });
    
    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
    });
    
    card.addEventListener('click', (e) => {
      e.stopPropagation();
      document.querySelectorAll('.drag-card').forEach(c => c.classList.remove('selected-device'));
      card.classList.add('selected-device');
      state.selectedCardId = card.id;
    });
  });

  zones.forEach(zone => {
    zone.addEventListener('dragover', (e) => {
      e.preventDefault();
      zone.classList.add('dragover');
    });

    zone.addEventListener('dragleave', () => {
      zone.classList.remove('dragover');
    });

    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      zone.classList.remove('dragover');
      const cardId = e.dataTransfer.getData('text/plain');
      placeCard(cardId, zone.getAttribute('data-zone'));
    });

    zone.addEventListener('click', () => {
      if (state.selectedCardId) {
        placeCard(state.selectedCardId, zone.getAttribute('data-zone'));
        state.selectedCardId = null;
      }
    });
  });

  document.getElementById('btn-game-reset').addEventListener('click', () => {
    state.sortingGamePlacements = {};
    state.sortingGameChecked = false;
    renderSlide();
  });

  document.getElementById('btn-game-check').addEventListener('click', () => {
    state.sortingGameChecked = true;
    state.completedSlides.add(slides[state.currentSlideIndex].id);
    generateSidebar();
    renderSlide();
  });
}

function placeCard(cardId, zoneName) {
  if (cardId) {
    state.sortingGamePlacements[cardId] = zoneName;
    state.sortingGameChecked = false;
    renderSlide();
  }
}

// Matching Game component renderer
function renderMatchingGame(slide) {
  let rowsHtml = '';
  
  // Define colors for border lines matching the highlights
  const colors = {
    m1: '#E61E2A', // Orange-Red
    m2: '#1A7D4F', // Green
    m3: '#F39C12', // Yellow
    m4: '#3498DB', // Blue
    m5: '#9B59B6'  // Purple
  };

  slide.matchingItems.forEach(item => {
    let optionsHtml = '<option value="">-- Chọn thành phần --</option>';
    slide.components.forEach(comp => {
      optionsHtml += `<option value="${comp.value}">${comp.text.split(' - ')[0]}</option>`;
    });

    rowsHtml += `
      <div class="info-card" id="row-${item.id}" style="display: flex; align-items: center; justify-content: space-between; padding: 1rem 1.25rem; margin-bottom: 0.75rem; gap: 1rem; border-left: 5px solid ${colors[item.id] || 'var(--line-2)'}; transition: all 0.2s;">
        <div style="flex: 1; font-weight: 500; font-size: 0.95rem;">
          "${item.text}"
        </div>
        <div style="display: flex; align-items: center; gap: 0.75rem; flex-shrink: 0;">
          <select class="matching-select" data-id="${item.id}" style="padding: 0.5rem 0.75rem; border-radius: 8px; border: 1.5px solid var(--line-2); font-family: inherit; font-size: 0.88rem; outline: none; background: #fff; cursor: pointer; max-width: 280px; width: 220px; transition: all 0.15s;">
            ${optionsHtml}
          </select>
          <span class="matching-badge" id="badge-${item.id}" style="font-size: 1.1rem; font-weight: 700; width: 22px; text-align: center;"></span>
        </div>
      </div>
    `;
  });

  return `
    <div style="margin-top: 0.5rem;">
      <p style="margin-bottom: 1.25rem;">Thầy cô hãy quan sát câu lệnh (prompt) mẫu dưới đây và ghép từng đoạn văn bản được tô màu tương ứng với thành phần prompt chính xác:</p>
      
      <!-- Colored sentence preview box -->
      <div class="prompt-preview-box" style="line-height: 2; font-size: 1.08rem; padding: 1.5rem; background: var(--bg-soft); border-radius: var(--border-radius-lg); text-align: center; margin-bottom: 1.75rem; border: 1px solid var(--line); color: var(--ink);">
        " <span style="background-color: #FDECED; border-bottom: 2px solid #E61E2A; padding: 0.15rem 0.35rem; border-radius: 4px; font-weight: 500;">Đóng vai trò như một gia sư giỏi, chia nhỏ và giải thích những vấn đề phức tạp một cách dễ hiểu</span>, tôi muốn bạn <span style="background-color: #E7F3EC; border-bottom: 2px solid #1A7D4F; padding: 0.15rem 0.35rem; border-radius: 4px; font-weight: 500;">giải thích quá trình quang hợp</span> <span style="background-color: #FEF9E7; border-bottom: 2px solid #F39C12; padding: 0.15rem 0.35rem; border-radius: 4px; font-weight: 500;">cho một học sinh 14 tuổi</span>, <span style="background-color: #EBF5FB; border-bottom: 2px solid #3498DB; padding: 0.15rem 0.35rem; border-radius: 4px; font-weight: 500;">để hỗ trợ chuẩn bị cho kỳ thi sinh học</span>. Câu trả lời của bạn nên có <span style="background-color: #F5EEF8; border-bottom: 2px solid #9B59B6; padding: 0.15rem 0.35rem; border-radius: 4px; font-weight: 500;">300 từ, được viết bằng giọng điệu thân thiện và giáo dục</span>."
      </div>

      <!-- Matching questions -->
      <div style="margin-bottom: 1.5rem;">
        ${rowsHtml}
      </div>

      <div id="matching-feedback-message" style="margin-bottom: 1rem; display: none;"></div>

      <div style="display: flex; gap: 1rem; align-items: center;">
        <button class="btn btn-secondary" id="btn-matching-reset" style="display: none;">Làm lại</button>
        <button class="btn btn-primary" id="btn-matching-check">Kiểm tra kết quả</button>
      </div>
    </div>
  `;
}

// Setup matching game events
function setupMatchingGameEvents(slide) {
  const checkBtn = document.getElementById('btn-matching-check');
  const resetBtn = document.getElementById('btn-matching-reset');
  const selects = document.querySelectorAll('.matching-select');
  const feedbackMsg = document.getElementById('matching-feedback-message');

  // Load saved state if any
  state.matchingPlacements = state.matchingPlacements || {};
  state.matchingChecked = state.matchingChecked || false;

  // Restore values
  selects.forEach(select => {
    const id = select.getAttribute('data-id');
    if (state.matchingPlacements[id]) {
      select.value = state.matchingPlacements[id];
    }

    select.addEventListener('change', () => {
      state.matchingPlacements[id] = select.value;
      // Clear checking styles if changed
      select.style.borderColor = 'var(--line-2)';
      select.style.backgroundColor = '#fff';
      select.style.color = 'var(--ink)';
      document.getElementById(`badge-${id}`).innerHTML = '';
      feedbackMsg.style.display = 'none';
    });
  });

  if (state.matchingChecked) {
    evaluateMatchingResults(slide, selects, feedbackMsg, resetBtn, checkBtn);
  }

  checkBtn.addEventListener('click', () => {
    // Check if all are filled
    let allFilled = true;
    selects.forEach(select => {
      if (!select.value) allFilled = false;
    });

    if (!allFilled) {
      feedbackMsg.innerHTML = `
        <div class="placed-card incorrect" style="padding:1rem; font-weight:600; text-align:center; display:block;">
          Thầy cô vui lòng chọn thành phần phù hợp cho tất cả 5 đoạn văn bản!
        </div>
      `;
      feedbackMsg.style.display = 'block';
      return;
    }

    state.matchingChecked = true;
    state.completedSlides.add(slides[state.currentSlideIndex].id);
    generateSidebar();
    evaluateMatchingResults(slide, selects, feedbackMsg, resetBtn, checkBtn);
  });

  resetBtn.addEventListener('click', () => {
    state.matchingPlacements = {};
    state.matchingChecked = false;
    selects.forEach(select => {
      select.value = '';
      select.disabled = false;
      select.style.borderColor = 'var(--line-2)';
      select.style.backgroundColor = '#fff';
      select.style.color = 'var(--ink)';
      const id = select.getAttribute('data-id');
      document.getElementById(`badge-${id}`).innerHTML = '';
    });
    feedbackMsg.style.display = 'none';
    resetBtn.style.display = 'none';
    checkBtn.style.display = 'inline-flex';
  });
}

function evaluateMatchingResults(slide, selects, feedbackMsg, resetBtn, checkBtn) {
  let allCorrect = true;
  
  selects.forEach(select => {
    const id = select.getAttribute('data-id');
    const userVal = select.value;
    const correctVal = slide.matchingItems.find(item => item.id === id).correct;
    const badge = document.getElementById(`badge-${id}`);
    
    select.disabled = true;
    
    if (userVal === correctVal) {
      select.style.borderColor = 'var(--ok)';
      select.style.backgroundColor = 'var(--ok-tint)';
      select.style.color = 'var(--ok)';
      badge.innerHTML = '✓';
      badge.style.color = 'var(--ok)';
    } else {
      select.style.borderColor = 'var(--err)';
      select.style.backgroundColor = 'var(--err-tint)';
      select.style.color = 'var(--err)';
      badge.innerHTML = '✗';
      badge.style.color = 'var(--err)';
      allCorrect = false;
      
      const correctLabel = slide.components.find(comp => comp.value === correctVal).text.split(' - ')[0];
      badge.title = `Đáp án đúng: ${correctLabel}`;
    }
  });

  if (allCorrect) {
    feedbackMsg.innerHTML = `
      <div class="placed-card correct" style="padding:1rem; font-weight:600; text-align:center; display:block;">
        🎉 Tuyệt vời! Thầy cô đã ghép chính xác tất cả các yếu tố của một prompt tốt!
      </div>
    `;
  } else {
    feedbackMsg.innerHTML = `
      <div class="placed-card incorrect" style="padding:1rem; font-weight:600; text-align:center; display:block;">
        Một số đoạn văn bản đã bị ghép sai thành phần. Thầy cô vui lòng làm lại và thử lại nhé!
      </div>
    `;
  }
  feedbackMsg.style.display = 'block';
  
  checkBtn.style.display = 'none';
  resetBtn.style.display = 'inline-flex';
}

// Prompt Comparison Renderer
function renderPromptComparisonView(slide) {
  return `
    <div class="equality-equity-container">
      <div class="ee-card">
        <div class="ee-header">
          <span class="ee-badge equality" style="background-color: var(--err-tint); color: var(--err);">Prompt mơ hồ</span>
          <h4 style="color:var(--ink);">Cần cải thiện</h4>
        </div>
        <p style="font-size:0.95rem; margin-top:0.5rem; line-height:1.6; color:var(--text-primary);">
          <strong>Nội dung:</strong> "${slide.vaguePrompt}"
        </p>
        <div style="background-color: var(--err-tint); border-left: 4px solid var(--err); padding: 0.75rem; border-radius: 4px; font-size: 0.85rem; margin-top: auto;">
          <strong>Nhận xét:</strong> Thiếu các chi tiết bối cảnh cốt lõi, không gán vai trò (Persona) cho AI và chưa quy định giới hạn cũng như đối tượng mục tiêu của đầu ra.
        </div>
      </div>

      <div class="ee-card" style="border-color: var(--accent-teal); background-color: var(--bg-soft)">
        <div class="ee-header">
          <span class="ee-badge equity" style="background-color: var(--ok-tint); color: var(--accent-emerald);">Prompt chi tiết</span>
          <h4 style="color:var(--ink);">Khuyên dùng</h4>
        </div>
        <p style="font-size:0.95rem; margin-top:0.5rem; line-height:1.6; color:var(--text-primary);">
          <strong>Nội dung:</strong> "${slide.refinedPrompt}"
        </p>
        <div style="background-color: var(--ok-tint); border-left: 4px solid var(--accent-emerald); padding: 0.75rem; border-radius: 4px; font-size: 0.85rem; margin-top: auto;">
          <strong>Nhận xét:</strong> Cung cấp đầy đủ 5 thành phần cốt lõi: Nhập vai (Giáo viên môn Địa lý), nhiệm vụ rõ ràng (3 nguyên nhân chính), đối tượng cụ thể (học sinh cấp 3), bối cảnh (thuyết trình lớp học) và giới hạn độ dài ngắn gọn.
        </div>
      </div>
    </div>
  `;
}

// Quiz Component Renderer
function renderQuizView(slide) {
  const qIdx = slide.questionIndex;
  const chosenOpts = state.quizAnswers[qIdx] || [];
  const isSubmitted = state.quizSubmitted[qIdx] === true;

  let optionsHtml = '';
  slide.options.forEach((opt, idx) => {
    const isSelected = chosenOpts.includes(idx);
    let optClass = 'quiz-option';
    if (isSelected) {
      optClass += ' selected';
    }

    optionsHtml += `
      <div class="${optClass}" data-opt="${idx}">
        <span class="quiz-option-checkbox"></span>
        <span class="quiz-option-text">${opt}</span>
      </div>
    `;
  });

  const isSubmitDisabled = !isSubmitted && chosenOpts.length === 0;

  return `
    <div class="quiz-container">
      <div class="quiz-q-header">Câu hỏi</div>
      <div class="quiz-q-index"><b>${slide.questionIndex + 1}</b> / 4</div>
      <hr class="quiz-divider" />
      
      <div class="quiz-card">
        <h3 class="quiz-question">${slide.title}</h3>
        
        <div class="quiz-options ${slide.isMultiSelect ? 'multi' : 'single'}">
          ${optionsHtml}
        </div>

        <div class="quiz-submit-area">
          <button class="btn-pill-submit" id="btn-quiz-submit" ${isSubmitDisabled ? 'disabled' : ''}>
            ${UI_STRINGS.quizBtnSubmit}
          </button>
        </div>
      </div>
    </div>
  `;
}

function setupQuizEvents(slide) {
  const qIdx = slide.questionIndex;
  const isSubmitted = state.quizSubmitted[qIdx] === true;

  if (!isSubmitted) {
    if (!state.quizAnswers[qIdx]) {
      state.quizAnswers[qIdx] = [];
    }

    document.querySelectorAll('.quiz-option').forEach(opt => {
      opt.addEventListener('click', () => {
        const idx = parseInt(opt.getAttribute('data-opt'));
        const indexInArr = state.quizAnswers[qIdx].indexOf(idx);

        if (slide.isMultiSelect) {
          if (indexInArr > -1) {
            state.quizAnswers[qIdx].splice(indexInArr, 1);
          } else {
            state.quizAnswers[qIdx].push(idx);
          }
        } else {
          state.quizAnswers[qIdx] = [idx];
        }
        renderSlide();
      });
    });
  }

  const submitBtn = document.getElementById('btn-quiz-submit');
  if (submitBtn) {
    submitBtn.addEventListener('click', () => {
      state.quizSubmitted[qIdx] = true;
      generateSidebar();
      showQuizFeedbackModal(slide);
    });
  }
}

// Show the feedback modal overlay
function showQuizFeedbackModal(slide) {
  const qIdx = slide.questionIndex;
  const chosenOpts = state.quizAnswers[qIdx] || [];

  let isCorrect = false;
  if (slide.isMultiSelect) {
    const correctAnswers = slide.correctAnswers;
    const allCorrectChosen = correctAnswers.every(c => chosenOpts.includes(c));
    const noIncorrectChosen = chosenOpts.every(c => correctAnswers.includes(c));
    isCorrect = allCorrectChosen && noIncorrectChosen;
  } else {
    isCorrect = chosenOpts[0] === slide.correctAnswers[0];
  }

  const iconContainer = document.getElementById('feedback-modal-icon-container');
  iconContainer.className = `feedback-modal-icon-container ${isCorrect ? 'correct' : 'incorrect'}`;
  
  if (isCorrect) {
    iconContainer.innerHTML = `
      <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="width:36px; height:36px;">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    `;
  } else {
    iconContainer.innerHTML = `
      <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="width:36px; height:36px;">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    `;
  }

  document.getElementById('feedback-modal-status').innerText = isCorrect ? UI_STRINGS.quizFeedbackTitleCorrect : UI_STRINGS.quizFeedbackTitleIncorrect;
  document.getElementById('feedback-modal-body').innerText = slide.explanation;
  
  document.getElementById('feedback-modal-footer').innerText = '';

  document.getElementById('quiz-feedback-overlay').classList.add('active');
}

function closeFeedbackModal() {
  document.getElementById('quiz-feedback-overlay').classList.remove('active');
  navigateNext();
}

// Summary Score Card
function renderSummaryView() {
  const quizSlides = slides.filter(s => s.type === 'quiz');
  const totalQuestions = quizSlides.length;
  
  let score = 0;
  quizSlides.forEach(s => {
    const qIdx = s.questionIndex;
    const chosen = state.quizAnswers[qIdx] || [];
    let isCorrect = false;

    if (s.isMultiSelect) {
      isCorrect = s.correctAnswers.every(c => chosen.includes(c)) && chosen.every(c => s.correctAnswers.includes(c));
    } else {
      isCorrect = chosen[0] === s.correctAnswers[0];
    }
    if (isCorrect) score++;
  });

  const pct = Math.round((score / totalQuestions) * 100);
  
  SCORM.reportScore(score, totalQuestions);
  SCORM.setCompleted();

  let rankText = UI_STRINGS.scoreRankPoor;
  if (pct >= 75) rankText = UI_STRINGS.scoreRankGood;
  else if (pct >= 50) rankText = UI_STRINGS.scoreRankAverage;

  return `
    <div class="quiz-score-banner">
      <div class="quiz-score-circle">
        <span class="quiz-score-num">${score}/${totalQuestions}</span>
        <span class="quiz-score-label">${UI_STRINGS.scoreResult}</span>
      </div>
      
      <p style="font-size:1.15rem; font-weight:600; color:var(--text-primary); max-width:400px; margin-top: 1rem; text-align: center;">
        ${rankText}
      </p>
      
      <button class="btn btn-secondary" id="btn-retake-quiz" style="margin-top:2rem;">
        Làm lại bài đánh giá
      </button>
    </div>
  `;
}

// Slide Routing & Custom Left-to-Right Transitions
function goToSlide(index) {
  if (index >= 0 && index < slides.length) {
    const currentSectionIndex = slides[state.currentSlideIndex].sectionIndex;
    const nextSectionIndex = slides[index].sectionIndex;

    if (!isSectionUnlocked(nextSectionIndex)) return;
    if (currentSectionIndex !== nextSectionIndex) {
      state.collapsedSectionIndex = null;
    }

    const direction = (index > state.currentSlideIndex) ? 'next' : 'prev';
    const viewport = document.getElementById('slide-viewport');
    
    const activeSlideEl = viewport.querySelector('.slide-content');
    
    if (activeSlideEl) {
      activeSlideEl.classList.add(direction === 'next' ? 'slide-out-left' : 'slide-out-right');
      
      state.currentSlideIndex = index;
      SCORM.setBookmark(index);

      setTimeout(() => {
        renderSlide();
        
        const newSlideEl = viewport.querySelector('.slide-content');
        if (newSlideEl) {
          newSlideEl.classList.add(direction === 'next' ? 'slide-in-right' : 'slide-in-left');
          newSlideEl.offsetHeight; // Force reflow
          newSlideEl.classList.remove('slide-in-right', 'slide-in-left');
        }
      }, 200);
    } else {
      state.currentSlideIndex = index;
      renderSlide();
    }
  }
}

// Navigation helpers
function navigateNext() {
  if (state.currentSlideIndex < slides.length - 1) {
    goToSlide(state.currentSlideIndex + 1);
  }
}

// Navigation helpers
function navigatePrev() {
  if (state.currentSlideIndex > 0) {
    goToSlide(state.currentSlideIndex - 1);
  }
}

function openDrawer() {
  document.getElementById('resources-drawer').classList.add('active');
  document.getElementById('resources-drawer-overlay').classList.add('active');
}

function closeDrawer() {
  document.getElementById('resources-drawer').classList.remove('active');
  document.getElementById('resources-drawer-overlay').classList.remove('active');
}

function retakeQuiz() {
  state.quizAnswers = {};
  state.quizSubmitted = {};
  const quizSectionIdx = sections.findIndex(sec => sec.id === 'sec-quiz');
  slides.filter(s => s.sectionIndex === quizSectionIdx).forEach(s => {
    state.completedSlides.delete(s.id);
  });
  const firstQuizSlide = slides.findIndex(s => s.sectionIndex === quizSectionIdx);
  if (firstQuizSlide >= 0) goToSlide(firstQuizSlide);
}

function restartCourse() {
  state.currentSlideIndex = 0;
  state.maxVisitedIndex = 0;
  state.completedSlides = new Set();
  state.quizAnswers = {};
  state.quizSubmitted = {};
  state.sortingGamePlacements = {};
  state.sortingGameChecked = false;
  state.selectedOptionIndexes = [];
  state.selectedCardId = null;
  SCORM.setBookmark(0);
  renderSlide();
}

window.addEventListener('unload', () => {
  SCORM.terminate();
});

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
  { id: 'sec-part1', title: 'Phần 1: AI cho soạn giáo án & kế hoạch bài dạy' },
  { id: 'sec-part2', title: 'Phần 2: AI cho tạo slide bài giảng' },
  { id: 'sec-part3', title: 'Phần 3: AI cho tạo học liệu số đa phương tiện' },
  { id: 'sec-quiz', title: 'Phần 4: Đánh giá và tổng kết', hideSubsections: true },
  { id: 'sec-next', title: 'Workshop trực tuyến nâng cao – Chủ đề 2', hideSubsections: true, alwaysUnlocked: true }
];

const slides = [
  // SECTION 0: INTRO
  {
    id: 'intro-welcome',
    sectionIndex: 0,
    type: 'intro',
    title: 'Nội dung chính',
    coverImage: '../home_ws2.png',
    content: `
      <div style="max-width:780px; margin: 0 auto;">
        <p style="font-size:1.05rem; margin-bottom:1.75rem; line-height:1.75; text-align:center;"><strong>Chủ đề 2 – Ứng dụng AI để thiết kế bài giảng, hoạt động học tập, học liệu số đa phương tiện</strong> hướng dẫn thầy cô sử dụng AI như một trợ lý trong toàn bộ quá trình chuẩn bị bài dạy: lên ý tưởng và kế hoạch bài học, tạo slide, thiết kế hình ảnh, âm thanh, hội thoại, podcast và sơ đồ tư duy. Mỗi sản phẩm do AI tạo ra cần được giáo viên kiểm tra, điều chỉnh và bổ sung chuyên môn trước khi sử dụng để bảo đảm chính xác, phù hợp với mục tiêu bài học và đối tượng học sinh.</p>

        <div style="border-top: 1px solid var(--line); padding-top: 1.25rem; margin-bottom: 1.25rem;">
          <p style="font-size:0.78rem; font-weight:700; text-transform:uppercase; letter-spacing:0.07em; color:var(--ink-3); margin-bottom:0.85rem;">Mục tiêu chủ đề</p>
          <div style="display:flex; gap:1rem; flex-wrap:wrap;">
            <div style="flex:1; min-width:180px; display:flex; align-items:flex-start; gap:0.65rem; background:var(--bg-soft); border-radius:var(--border-radius-md); padding:0.85rem 1rem;">
              <span style="font-size:1.35rem; line-height:1; flex-shrink:0;">📝</span>
              <div>
                <div style="font-size:0.82rem; font-weight:700; color:var(--brand); margin-bottom:0.2rem;">Soạn giáo án & kế hoạch</div>
                <div style="font-size:0.82rem; color:var(--ink-2); line-height:1.45;">Sử dụng AI Chatbot để lên ý tưởng, xây dựng kế hoạch bài dạy và phát triển hoạt động học tập; kiểm chứng, điều chỉnh đầu ra trước khi áp dụng.</div>
              </div>
            </div>
            <div style="flex:1; min-width:180px; display:flex; align-items:flex-start; gap:0.65rem; background:var(--bg-soft); border-radius:var(--border-radius-md); padding:0.85rem 1rem;">
              <span style="font-size:1.35rem; line-height:1; flex-shrink:0;">💻</span>
              <div>
                <div style="font-size:0.82rem; font-weight:700; color:var(--brand); margin-bottom:0.2rem;">Thiết kế slide bài giảng</div>
                <div style="font-size:0.82rem; color:var(--ink-2); line-height:1.45;">Tạo bài thuyết trình từ dàn ý, kế hoạch bài dạy hoặc tài liệu có sẵn; tinh chỉnh nội dung, bố cục và hình ảnh bằng Gamma AI.</div>
              </div>
            </div>
            <div style="flex:1; min-width:180px; display:flex; align-items:flex-start; gap:0.65rem; background:var(--bg-soft); border-radius:var(--border-radius-md); padding:0.85rem 1rem;">
              <span style="font-size:1.35rem; line-height:1; flex-shrink:0;">🎨</span>
              <div>
                <div style="font-size:0.82rem; font-weight:700; color:var(--brand); margin-bottom:0.2rem;">Học liệu số đa phương tiện</div>
                <div style="font-size:0.82rem; color:var(--ink-2); line-height:1.45;">Tạo và sử dụng có trách nhiệm hình ảnh, bài hát, bài đọc, hội thoại, podcast và sơ đồ tư duy với các công cụ AI phù hợp.</div>
              </div>
            </div>
          </div>
        </div>

        <p style="text-align:center; color:var(--ink-3); font-size:0.85rem;"><strong>Thời lượng dự kiến:</strong> ~90 phút (65 phút video · 5 hoạt động)</p>
      </div>
    `
  },

  // SECTION 1: AI CHO SOẠN GIÁO ÁN & KẾ HOẠCH BÀI DẠY
  {
    id: 'p1-chatbots',
    sectionIndex: 1,
    type: 'text',
    title: 'Tạo nội dung học tập với AI Chatbot',
    content: `
      <div style="font-size: 0.98rem; line-height: 1.7; max-width: 800px; margin: 0 auto;">
        <p style="margin-bottom: 1.25rem;">Các AI Chatbot như ChatGPT, Google Gemini, Microsoft Copilot, Anthropic Claude và Meta AI có thể hỗ trợ nhiều công việc chuẩn bị bài dạy. AI giúp mở rộng ý tưởng và rút ngắn thời gian biên soạn, nhưng giáo viên vẫn là người quyết định mục tiêu, lựa chọn nội dung và chịu trách nhiệm về sản phẩm cuối cùng.</p>
        
        <ul class="bullet-list" style="margin-bottom: 1.5rem;">
          <li><strong>Lên ý tưởng và xây dựng nội dung:</strong> Gợi ý mục tiêu, cấu trúc bài học, câu hỏi thảo luận, bài tập về nhà và tài liệu học tập.</li>
          <li><strong>Thiết kế hoạt động học tập:</strong> Đề xuất hoạt động khởi động, khám phá, luyện tập, vận dụng, trò chơi hoặc nhiệm vụ nhóm.</li>
          <li><strong>Kiểm tra và đánh giá:</strong> Hỗ trợ tạo câu hỏi, đáp án và phản hồi, nhưng giáo viên phải rà soát độ chính xác và mức độ phù hợp.</li>
          <li><strong>Cá nhân hóa:</strong> Điều chỉnh cách diễn đạt, độ khó và hình thức hoạt động cho từng nhóm học sinh mà không đưa dữ liệu cá nhân nhạy cảm vào công cụ AI.</li>
        </ul>
      </div>
    `
  },
  {
    id: 'p1-video',
    sectionIndex: 1,
    type: 'video',
    title: 'Ứng dụng AI để lên kế hoạch bài dạy',
    videoUrl: 'https://www.youtube-nocookie.com/embed/tSH5TkuJZPI',
    content: `
      <div class="info-card" style="border-left: 4px solid var(--rmit-red); background-color: var(--bg-soft); padding: 1.25rem; border-radius: var(--border-radius-md); max-width: 720px; margin: 1.5rem auto 0; box-shadow: var(--shadow-sm);">
        <h4 style="color: var(--ink); margin-bottom: 0.75rem; font-weight: 700; font-size: 1.05rem;">Tóm tắt</h4>
        <ul class="bullet-list" style="margin-top: 0; padding-left: 0; font-size: 0.95rem;">
          <li><strong>Xác định yêu cầu:</strong> Nêu rõ môn học, lớp, chủ đề, thời lượng, mục tiêu, đối tượng học sinh và định dạng đầu ra.</li>
          <li><strong>Tạo bản nháp với AI:</strong> Yêu cầu AI đề xuất kế hoạch, học liệu hoặc hoạt động phù hợp.</li>
          <li><strong>Trao đổi tiếp:</strong> Dùng câu lệnh tiếp theo để bổ sung chi tiết, điều chỉnh độ khó hoặc thay đổi hoạt động.</li>
          <li><strong>Kiểm duyệt và bảo mật:</strong> Đối chiếu với chương trình, tài liệu chính thống và điều kiện lớp học; không nhập thông tin cá nhân hoặc dữ liệu nhạy cảm của học sinh.</li>
        </ul>
      </div>
    `
  },
  {
    id: 'p1-practice',
    sectionIndex: 1,
    type: 'text',
    title: 'Thực hành lên ý tưởng bài giảng',
    content: `
      <div style="font-size: 0.98rem; line-height: 1.7; max-width: 800px; margin: 0 auto;">
        <p style="margin-bottom: 1rem;">Dưới đây là một ví dụ prompt thiết kế giáo án cụ thể. Thầy cô có thể sao chép và điều chỉnh thông tin để gửi cho AI Chatbot:</p>
        
        <div class="info-card" style="border-left: 4px solid var(--rmit-red); background-color: var(--bg-soft); padding: 1.25rem; margin-bottom: 1.5rem;">
          <h4 style="color: var(--brand); margin-bottom: 0.5rem; font-size: 1.05rem;"><strong>Prompt mẫu soạn kế hoạch bài dạy:</strong></h4>
          <div style="background-color: #ffffff; border: 1px dashed var(--line-2); border-radius: var(--border-radius-sm); padding: 1rem; font-style: italic; color: var(--brand); line-height: 1.5;">
            "Bạn là giáo viên Khoa học lớp 4. Hãy thiết kế một kế hoạch bài dạy 45 phút cho bài 'Vòng tuần hoàn của nước' theo định hướng phát triển năng lực. Kế hoạch bài dạy cần bao gồm: mục tiêu bài học, các hoạt động học tập (khởi động, khám phá, luyện tập, vận dụng) và đề xuất 1 hoạt động thực hành hoặc trò chơi tương tác thú vị để học sinh dễ tiếp thu bài."
          </div>
        </div>
        
        <h4 style="color: var(--brand); margin-bottom: 0.5rem; font-size: 1.05rem;"><strong>Lệnh tiếp theo để khai thác sâu:</strong></h4>
        <p style="margin-bottom: 1rem;">Sau khi AI Chatbot đưa ra khung kế hoạch bài dạy chung, thầy cô có thể sử dụng câu lệnh tiếp theo để AI thiết kế chi tiết hoạt động mong muốn:</p>
        <div class="info-card" style="border-left: 4px solid var(--accent); background-color: var(--bg-soft); padding: 1.25rem; margin-bottom: 1.5rem;">
          <div style="background-color: #ffffff; border: 1px dashed var(--line-2); border-radius: var(--border-radius-sm); padding: 1rem; font-style: italic; color: var(--brand); line-height: 1.5;">
            "Hãy thiết kế chi tiết hoạt động Khám phá bằng một trò chơi nhập vai mang tên 'Hành trình của giọt nước' kéo dài 10 phút, bao gồm luật chơi và cách tổ chức cho học sinh."
          </div>
        </div>
        
        <h4 style="color: var(--brand); margin-bottom: 0.5rem; font-size: 1.05rem;"><strong>Kiểm chứng trước khi sử dụng:</strong></h4>
        <ul class="bullet-list" style="font-size:0.95rem;">
          <li><strong>Đúng mục tiêu:</strong> Các hoạt động và câu hỏi phải thực sự giúp học sinh đạt mục tiêu bài học.</li>
          <li><strong>Đúng kiến thức:</strong> Đối chiếu nội dung với chương trình, sách giáo khoa và nguồn chuyên môn đáng tin cậy.</li>
          <li><strong>Khả thi:</strong> Điều chỉnh thời lượng, luật chơi, học liệu và cách tổ chức theo điều kiện lớp học thực tế.</li>
          <li><strong>Phù hợp người học:</strong> Rà soát ngôn ngữ, độ khó, tính bao trùm và an toàn đối với học sinh.</li>
        </ul>
      </div>
    `
  },
  {
    id: 'p2-video-intro',
    sectionIndex: 2,
    type: 'video',
    title: 'Tạo slide bài giảng với Gamma AI',
    videoUrl: 'https://www.youtube-nocookie.com/embed/l1FrIzmveZQ',
    content: `
      <div class="info-card" style="border-left: 4px solid var(--rmit-red); background-color: var(--bg-soft); padding: 1.25rem; border-radius: var(--border-radius-md); max-width: 720px; margin: 1.5rem auto 0; box-shadow: var(--shadow-sm);">
        <h4 style="color: var(--ink); margin-bottom: 0.75rem; font-weight: 700; font-size: 1.05rem;">Tóm tắt</h4>
        <ul class="bullet-list" style="margin-top: 0; padding-left: 0; font-size: 0.95rem;">
          <li>Tạo bản nháp bài thuyết trình từ ý tưởng, dàn ý, kế hoạch bài dạy hoặc nội dung được dán vào.</li>
          <li>Tự động chia nội dung thành các trang, đề xuất bố cục, chủ đề trình bày và hình ảnh minh họa.</li>
          <li>Cho phép chỉnh sửa trực tiếp hoặc dùng <strong>Edit with AI</strong> để rút gọn, viết lại, thay đổi bố cục và hình ảnh.</li>
          <li>Hỗ trợ xuất bài thuyết trình để tiếp tục rà soát và hoàn thiện trước khi giảng dạy.</li>
        </ul>
      </div>
    `
  },
  {
    id: 'p2-activity',
    sectionIndex: 2,
    type: 'text',
    title: 'Hoạt động: Thiết kế Slide bài giảng với Gamma AI',
    content: `
      <div style="font-size: 0.98rem; line-height: 1.7; max-width: 800px; margin: 0 auto;">
        <p style="margin-bottom: 1.25rem;">Thầy cô hãy thực hành thiết kế bài thuyết trình tự động từ kế hoạch bài dạy đã chuẩn bị ở phần trước bằng công cụ Gamma AI:</p>
        
        <div class="info-card" style="border-left: 4px solid var(--rmit-red); background-color: var(--bg-soft); margin-bottom: 1.5rem; padding: 1.25rem;">
          <h4 style="color: var(--brand); margin-bottom: 0.5rem; font-size: 1.05rem;"><strong>Nhiệm vụ thực hành (10 phút):</strong></h4>
          <ol style="margin-left: 1.5rem; margin-top: 0.5rem; display: flex; flex-direction: column; gap: 0.6rem; padding-left: 0;">
            <li style="padding-left: 0.5rem;"><strong>Nhập kế hoạch bài dạy:</strong> Sử dụng nội dung kế hoạch bài dạy "Vòng tuần hoàn của nước" (hoặc chủ đề giảng dạy thực tế thầy cô vừa tạo ở Phần 1) để dán vào Gamma AI ở chế độ dán văn bản (Paste in text).</li>
            <li style="padding-left: 0.5rem;"><strong>Tạo slide tự động:</strong> Chọn kiểu đầu ra là <strong>Presentation</strong>, chọn số lượng slide mong muốn, chọn giao diện (Theme) phù hợp và nhấn tạo slide.</li>
            <li style="padding-left: 0.5rem;"><strong>Tinh chỉnh & Thiết kế:</strong> Tùy biến slide trực tiếp trên Gamma AI hoặc dùng tính năng <strong>Edit with AI</strong> để ra lệnh cho AI chỉnh sửa nhanh bố cục, nội dung hoặc thay đổi hình ảnh sinh động.</li>
            <li style="padding-left: 0.5rem;"><strong>Xuất bản và kiểm tra:</strong> Xuất bài thuyết trình dưới dạng tệp <strong>PowerPoint (PPTX)</strong>, mở tệp trên máy tính để rà soát nội dung, định dạng, căn lề, hình ảnh và khả năng đọc trước khi giảng dạy.</li>
          </ol>
        </div>
      </div>
    `
  },

  // SECTION 3: AI CHO TẠO HỌC LIỆU SỐ ĐA PHƯƠNG TIỆN
  {
    id: 'p3-images',
    sectionIndex: 3,
    type: 'video',
    title: 'Dùng AI để tạo ảnh, tranh vẽ cho giảng dạy',
    videoUrl: 'https://www.youtube-nocookie.com/embed/om6IOL3ogOs',
    content: `
      <div style="font-size: 0.98rem; line-height: 1.7; max-width: 800px; margin: 0 auto;">
        <p style="margin-bottom: 1rem;">AI tạo ảnh có thể giúp bài giảng trực quan hơn, tiết kiệm thời gian chuẩn bị và mở rộng cơ hội sáng tạo cho giáo viên, học sinh. Ba cách thực hành phổ biến là tạo ảnh từ mô tả, biến phác thảo thành ảnh hoàn chỉnh và dùng prompt đảo ngược để phân tích một hình mẫu.</p>
        
        <div class="info-card" style="border-left: 4px solid var(--accent); background-color: #ffffff; padding: 1.25rem; margin-bottom: 1.25rem;">
          <h4 style="color: var(--brand); margin-bottom: 0.5rem; font-size: 1.05rem;"><strong>Lưu ý quan trọng khi sử dụng ảnh AI:</strong></h4>
          <ul class="bullet-list" style="font-size: 0.9rem; padding-left: 0; margin-bottom: 0;">
            <li style="padding-left: 1.2rem; margin-bottom: 0.3rem;">Không dùng hình ảnh mô phỏng người thật nếu chưa được sự đồng ý của họ.</li>
            <li style="padding-left: 1.2rem; margin-bottom: 0.3rem;">Chọn phong cách ảnh rõ ràng, dễ nhận biết là ảnh do AI tạo ra.</li>
            <li style="padding-left: 1.2rem; margin-bottom: 0.3rem;">Tôn trọng bản quyền bằng cách sử dụng các phong cách nghệ thuật chung thay vì sao chép phong cách riêng của một họa sĩ cụ thể.</li>
            <li style="padding-left: 1.2rem; margin-bottom: 0.3rem;">Viết mô tả ảnh (prompt) bằng ngôn ngữ an toàn, phù hợp môi trường giáo dục.</li>
          </ul>
        </div>
      </div>
    `
  },
  {
    id: 'p3-advanced-images',
    sectionIndex: 3,
    type: 'text',
    title: 'Hoạt động: Sử dụng kỹ thuật prompt đảo ngược',
    content: `
      <div style="font-size: 0.98rem; line-height: 1.7; max-width: 800px; margin: 0 auto;">
        <p style="margin-bottom: 1.25rem;">Kỹ thuật <strong>prompt đảo ngược (Reverse Prompting)</strong> giúp thầy cô nhanh chóng trích xuất câu lệnh tạo ảnh từ một học liệu trực quan sẵn có (sơ đồ quy trình, ảnh chụp, tranh minh họa giáo khoa...) để tái tạo hoặc thiết kế lại theo phong cách thiết kế mới.</p>
        
        <!-- Ví dụ Minh họa Thực tế -->
        <div class="info-card" style="border-left: 4px solid var(--rmit-blue); background-color: var(--bg-soft); margin-bottom: 1.5rem; padding: 1.25rem;">
          <h4 style="color: var(--brand); margin-bottom: 0.5rem; font-size: 1.05rem;"><strong>Ví dụ thực tế: Tái tạo sơ đồ quang hợp của cây xanh</strong></h4>
          <p style="font-size: 0.92rem; margin-bottom: 0.75rem;"><strong>Tình huống:</strong> Thầy cô có một bức ảnh sơ đồ quang hợp cũ và muốn vẽ lại thành sơ đồ dạng hoạt hình (cartoon style) thân thiện, sinh động cho học sinh lớp 4.</p>
          
          <div style="margin-bottom: 1rem;">
            <strong style="font-size: 0.9rem; color: var(--accent);">Bước 1: Gửi lệnh phân tích đảo ngược cho AI (ChatGPT/Gemini)</strong>
            <div style="background-color: #ffffff; border: 1px dashed var(--line-2); border-radius: var(--border-radius-sm); padding: 0.85rem; font-style: italic; color: var(--brand); margin-top: 0.3rem; font-size: 0.9rem; line-height: 1.45;">
              "Bạn là chuyên gia thiết kế đồ họa học liệu. Hãy phân tích bố cục, phong cách nghệ thuật và các chi tiết trong ảnh sơ đồ quang hợp này. Sau đó, viết một câu lệnh prompt chi tiết bằng tiếng Anh để tôi tạo ra một bức ảnh sơ đồ quang hợp tương tự nhưng theo phong cách hoạt hình (cute cartoon illustration) tươi sáng cho học sinh tiểu học."
            </div>
          </div>

          <div>
            <strong style="font-size: 0.9rem; color: var(--ok);">Bước 2: Nhận câu lệnh đề xuất từ AI để tạo ảnh mới</strong>
            <div style="background-color: #ffffff; border: 1px dashed var(--line-2); border-radius: var(--border-radius-sm); padding: 0.85rem; font-style: normal; color: var(--ink); margin-top: 0.3rem; font-size: 0.88rem; line-height: 1.45;">
              <strong>Prompt gợi ý từ AI:</strong> <em>"A cute cartoon-style educational infographic diagram of photosynthesis. A smiling tree with green leaves, bright sun rays shining on it, clear arrows showing carbon dioxide entering and oxygen exiting. Soft pastel colors, clean lines, suitable for primary school classroom, isolated on a white background."</em>
            </div>
          </div>
        </div>

        <!-- Nhiệm vụ Thực hành -->
        <div class="info-card" style="border-left: 4px solid var(--rmit-red); background-color: var(--bg-soft); padding: 1.25rem;">
          <h4 style="color: var(--brand); margin-bottom: 0.5rem; font-size: 1.05rem;"><strong>Nhiệm vụ thực hành (10 phút):</strong></h4>
          <ol style="margin-left: 1.5rem; margin-top: 0.5rem; display: flex; flex-direction: column; gap: 0.6rem; padding-left: 0;">
            <li style="padding-left: 0.5rem;"><strong>Lựa chọn học liệu nguồn:</strong> Chọn một sơ đồ bài học, infographic hoặc tranh minh họa cũ từ giáo án của thầy cô cần làm mới.</li>
            <li style="padding-left: 0.5rem;"><strong>Thực hiện Prompt đảo ngược:</strong> Tải bức ảnh lên AI Chatbot (Gemini, ChatGPT) và sử dụng mẫu câu lệnh ở <strong>Bước 1</strong> để thu về câu lệnh mô tả tiếng Anh.</li>
            <li style="padding-left: 0.5rem;"><strong>Tạo và Việt hóa học liệu:</strong> Dán câu lệnh tiếng Anh vào công cụ tạo ảnh (Canva Magic Media, Bing Image Creator hoặc Leonardo AI). Thầy cô có thể tùy biến thêm bớt chi tiết, sau đó chèn thêm nhãn tiếng Việt trên Canva để hoàn thiện sơ đồ giảng dạy.</li>
          </ol>
        </div>
      </div>
    `
  },
  {
    id: 'p3-suno',
    sectionIndex: 3,
    type: 'video',
    title: 'Sáng tác nhạc với Suno AI',
    videoUrl: 'https://www.youtube-nocookie.com/embed/WFxUhauGVrY',
    content: `
      <div style="font-size: 0.98rem; line-height: 1.7; max-width: 800px; margin: 0 auto;">
        <p style="margin-bottom: 1rem;">Suno AI có thể tạo bài hát khởi động, bài hát cổ động hoạt động nhóm hoặc bài hát giúp học sinh ghi nhớ từ vựng và kiến thức theo chủ đề. Giáo viên không cần tự phối nhạc, nhưng cần chuẩn bị mục tiêu, lời bài hát và phong cách phù hợp với lứa tuổi.</p>
        
        <div class="info-card" style="border-left: 4px solid var(--accent); background-color: #ffffff; padding: 1.25rem; margin-bottom: 1.25rem;">
          <h4 style="color: var(--brand); margin-bottom: 0.5rem; font-size: 1.05rem;"><strong>Mẹo sáng tác nhạc hiệu quả với Suno AI:</strong></h4>
          <ul class="bullet-list" style="font-size: 0.9rem; padding-left: 0; margin-bottom: 0;">
            <li style="padding-left: 1.2rem; margin-bottom: 0.3rem;"><strong>Tận dụng ChatGPT soạn lời:</strong> Nhờ AI soạn trước lời bài hát có vần điệu (vè, thơ) theo đúng chủ đề bài học để dán vào ô Lyrics.</li>
            <li style="padding-left: 1.2rem; margin-bottom: 0.3rem;"><strong>Sử dụng Style mô tả phong cách:</strong> Dùng các từ khóa thể loại nhạc bằng tiếng Anh để Suno hiểu đúng nhịp điệu mong muốn (ví dụ: <em>"acoustic, upbeat, cheerful pop, energetic"</em>).</li>
            <li style="padding-left: 1.2rem; margin-bottom: 0.3rem;"><strong>Mô tả nhịp độ và âm thanh:</strong> Có thể chỉ định tốc độ BPM, loại giọng hát và nhạc cụ để sản phẩm phù hợp với lứa tuổi và hoạt động học tập.</li>
            <li style="padding-left: 1.2rem; margin-bottom: 0.3rem;"><strong>Nghe và chỉnh sửa:</strong> Kiểm tra phát âm, ca từ, thông điệp và mức độ phù hợp trước khi sử dụng trong lớp học.</li>
          </ul>
        </div>
      </div>
    `
  },
  {
    id: 'p3-ai-studio',
    sectionIndex: 3,
    type: 'video',
    title: 'Dùng AI để tạo bài hội thoại',
    videoUrl: 'https://www.youtube-nocookie.com/embed/ap6vn5aUcig',
    content: `
      <div style="font-size: 0.98rem; line-height: 1.7; max-width: 800px; margin: 0 auto;">
        <p style="margin-bottom: 1.25rem;">Công nghệ <strong>Native Speech Generation</strong> trong <strong>Google AI Studio</strong> cho phép chuyển văn bản thành giọng đọc hoặc hội thoại tự nhiên. Thầy cô có thể mô tả phong cách đọc, lựa chọn giọng và phân vai cho từng người nói.</p>
        
        <div class="info-card" style="border-left: 4px solid var(--accent); background-color: #ffffff; padding: 1.25rem; margin-bottom: 1.25rem;">
          <h4 style="color: var(--brand); margin-bottom: 0.5rem; font-size: 1.05rem;"><strong>Ứng dụng thiết thực trong dạy học:</strong></h4>
          <ul class="bullet-list" style="font-size: 0.9rem; padding-left: 0; margin-bottom: 0;">
            <li style="padding-left: 1.2rem; margin-bottom: 0.3rem;"><strong>Luyện phát âm & đọc mẫu:</strong> Tự động chuyển đổi văn bản hoặc bài học ngoại ngữ thành tệp đọc mẫu chuẩn tự nhiên, giúp học sinh luyện nghe và bắt chước ngữ điệu bài học.</li>
            <li style="padding-left: 1.2rem; margin-bottom: 0.3rem;"><strong>Tạo đàm thoại tình huống:</strong> Thiết kế các đoạn hội thoại đa giọng đọc (Multi-speaker) cho các bài học giao tiếp thực tế (mua sắm, sân bay, thảo luận công việc) vô cùng chân thực.</li>
            <li style="padding-left: 1.2rem; margin-bottom: 0.3rem;"><strong>Hỗ trợ tiếp cận:</strong> Tạo bản nghe cho học sinh gặp khó khăn trong đọc hiểu hoặc cần học liệu âm thanh để tự ôn tập.</li>
            <li style="padding-left: 1.2rem; margin-bottom: 0.3rem;"><strong>Xuất bản học liệu nghe:</strong> Tải tệp âm thanh để chèn vào slide, video hoặc hoạt động học tập; nghe lại để kiểm tra phát âm, nhịp ngắt và nội dung.</li>
          </ul>
        </div>
      </div>
    `
  },
  {
    id: 'p3-activity-audio',
    sectionIndex: 3,
    type: 'text',
    title: 'Hoạt động: Tạo bài hát hoặc bài hội thoại',
    content: `
      <div style="font-size: 0.98rem; line-height: 1.7; max-width: 800px; margin: 0 auto;">
        <p style="margin-bottom: 1.25rem;">Thầy cô hãy lựa chọn trải nghiệm thực hành một trong hai nhiệm vụ thiết kế học liệu âm thanh dưới đây:</p>
        
        <div class="info-card" style="border-left: 4px solid var(--rmit-red); background-color: var(--bg-soft); margin-bottom: 1.5rem; padding: 1.25rem;">
          <h4 style="color: var(--brand); margin-bottom: 0.5rem; font-size: 1.05rem;"><strong>Lựa chọn 1: Sáng tác bài hát lớp học với Suno AI</strong></h4>
          <ol style="margin-left: 1.5rem; margin-top: 0.3rem; margin-bottom: 1.25rem; display: flex; flex-direction: column; gap: 0.4rem; padding-left: 0;">
            <li style="padding-left: 0.5rem;"><strong>Chuẩn bị lời hát:</strong> Nhờ ChatGPT soạn một bài thơ hoặc lời hát ngắn có vần điệu về một chủ đề bài giảng thầy cô đang dạy (ví dụ: công thức Toán, từ vựng Tiếng Anh, hoặc một câu chuyện Lịch sử).</li>
            <li style="padding-left: 0.5rem;"><strong>Tạo và phối nhạc:</strong> Truy cập <strong>suno.com</strong> &rarr; bật chế độ <strong>Custom</strong> &rarr; dán lời nhạc và mô tả phong cách nhạc bằng tiếng Anh (ví dụ: <em>"acoustic pop, cheerful, upbeat"</em> hoặc <em>"guitar ballad, warm"</em>) &rarr; nhấn <strong>Create</strong> để nghe sản phẩm.</li>
          </ol>
          
          <h4 style="color: var(--brand); margin-bottom: 0.5rem; font-size: 1.05rem;"><strong>Lựa chọn 2: Tạo tệp đàm thoại tình huống với Google AI Studio</strong></h4>
          <ol style="margin-left: 1.5rem; margin-top: 0.3rem; margin-bottom: 0; display: flex; flex-direction: column; gap: 0.4rem; padding-left: 0;">
            <li style="padding-left: 0.5rem;"><strong>Chuẩn bị kịch bản:</strong> Soạn hoặc nhờ Gemini viết một đoạn đối thoại ngắn (ví dụ: hội thoại giao tiếp tiếng Anh, cuộc phỏng vấn lịch sử, hoặc cuộc thảo luận giải quyết vấn đề của học sinh).</li>
            <li style="padding-left: 0.5rem;"><strong>Lồng tiếng đa nhân vật:</strong> Mở <strong>Google AI Studio</strong> &rarr; ghi rõ Speaker 1, Speaker 2 và phong cách đọc của từng nhân vật &rarr; gán giọng phù hợp &rarr; chạy thử và xuất tệp âm thanh để chèn vào bài giảng.</li>
          </ol>
        </div>
      </div>
    `
  },
  {
    id: 'p3-notebooklm',
    sectionIndex: 3,
    type: 'video',
    title: 'Tạo học liệu nghe & sơ đồ tư duy với NotebookLM',
    videoUrl: 'https://www.youtube-nocookie.com/embed/pbfHZatpvzQ',
    content: `
      <div style="font-size: 0.98rem; line-height: 1.7; max-width: 800px; margin: 0 auto;">
        <p style="margin-bottom: 1rem;">Google NotebookLM giúp giáo viên tóm tắt, phân tích và tương tác với các tài liệu được tải lên. Câu trả lời được xây dựng dựa trên nguồn đã cung cấp và có thể kèm vị trí tham chiếu để người dùng kiểm tra lại thông tin.</p>
        
        <div class="info-card" style="border-left: 4px solid var(--accent); background-color: #ffffff; padding: 1.25rem; margin-bottom: 1.25rem;">
          <h4 style="color: var(--brand); margin-bottom: 0.5rem; font-size: 1.05rem;"><strong>Các dạng học liệu số thiết thực tạo ra từ tài liệu thô:</strong></h4>
          <ul class="bullet-list" style="font-size: 0.9rem; padding-left: 0; margin-bottom: 0;">
            <li style="padding-left: 1.2rem; margin-bottom: 0.3rem;"><strong>Hỏi đáp có tham chiếu:</strong> Đặt câu hỏi về tài liệu và mở nguồn tham chiếu để đối chiếu câu trả lời.</li>
            <li style="padding-left: 1.2rem; margin-bottom: 0.3rem;"><strong>Tóm tắt và ghi chú:</strong> Hệ thống hóa tài liệu thành ghi chú, đề cương hoặc câu hỏi ôn tập. Nội dung cần giữ lại phải được lưu vào mục ghi chú.</li>
            <li style="padding-left: 1.2rem; margin-bottom: 0.3rem;"><strong>Podcast học tập:</strong> Tạo Audio Overview dưới dạng cuộc trò chuyện giải thích nội dung nguồn.</li>
            <li style="padding-left: 1.2rem; margin-bottom: 0.3rem;"><strong>Sơ đồ tư duy:</strong> Trực quan hóa các khái niệm và mối quan hệ chính trong tài liệu.</li>
          </ul>
        </div>
      </div>
    `
  },
  {
    id: 'p3-activity-notebooklm',
    sectionIndex: 3,
    type: 'text',
    title: 'Hoạt động: Tạo Podcast học tập với NotebookLM',
    content: `
      <div style="font-size: 0.98rem; line-height: 1.7; max-width: 800px; margin: 0 auto;">
        <p style="margin-bottom: 1.25rem;">Thầy cô hãy thực hành thiết kế tệp podcast đối thoại học tập từ tài liệu chuyên môn của mình bằng công cụ Google NotebookLM:</p>
        
        <div class="info-card" style="border-left: 4px solid var(--rmit-red); background-color: var(--bg-soft); margin-bottom: 1.5rem; padding: 1.25rem;">
          <h4 style="color: var(--brand); margin-bottom: 0.5rem; font-size: 1.05rem;"><strong>Nhiệm vụ thực hành (10 phút):</strong></h4>
          <ol style="margin-left: 1.5rem; margin-top: 0.5rem; display: flex; flex-direction: column; gap: 0.6rem; padding-left: 0;">
            <li style="padding-left: 0.5rem;"><strong>Chuẩn bị tài liệu nguồn:</strong> Chọn một tài liệu giảng dạy (như đề cương môn học, bài đọc bổ trợ, bài báo khoa học...) mà thầy cô muốn học sinh thảo luận.</li>
            <li style="padding-left: 0.5rem;"><strong>Tương tác với nguồn:</strong> Đặt một câu hỏi về nội dung tài liệu, xem câu trả lời và mở phần tham chiếu để kiểm tra bằng chứng trong nguồn.</li>
            <li style="padding-left: 0.5rem;"><strong>Tạo tệp âm thanh đối thoại:</strong> Tại mục Audio Overview, chọn tạo podcast để AI xây dựng cuộc trò chuyện giải thích tài liệu nguồn.</li>
            <li style="padding-left: 0.5rem;"><strong>Đánh giá và kiểm chứng:</strong> Lắng nghe podcast, đối chiếu các ý chính với tài liệu gốc và ghi lại điểm cần chỉnh sửa hoặc bổ sung.</li>
            <li style="padding-left: 0.5rem;"><strong>Lên phương án ứng dụng:</strong> Tích hợp podcast vào hoạt động nghe trước giờ học, thảo luận nhóm hoặc củng cố kiến thức; không xem sản phẩm AI là bản thay thế cho tài liệu gốc.</li>
          </ol>
        </div>
      </div>
    `
  },


  // SECTION 4: ASSESSMENT & SUMMARY
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
    title: 'Khi sử dụng AI Chatbot để xây dựng kế hoạch bài dạy, thầy cô nên thực hiện những việc nào sau đây? (Chọn các phương án đúng)',
    options: [
      'Nêu rõ môn học, lớp, mục tiêu, thời lượng, đối tượng học sinh và định dạng đầu ra.',
      'Dùng câu lệnh tiếp theo để yêu cầu AI phát triển hoặc điều chỉnh một hoạt động cụ thể.',
      'Đưa thông tin cá nhân chi tiết của học sinh vào prompt để AI cá nhân hóa chính xác hơn.',
      'Đối chiếu nội dung với chương trình, tài liệu chính thống và điều kiện lớp học trước khi sử dụng.'
    ],
    isMultiSelect: true,
    correctAnswers: [0, 1, 3],
    reviewSection: 'Phần 1: AI cho soạn giáo án & kế hoạch bài dạy',
    explanation: 'Quy trình phù hợp là cung cấp bối cảnh rõ ràng, trao đổi tiếp để hoàn thiện đầu ra và kiểm chứng trước khi sử dụng. Không nhập thông tin cá nhân hoặc dữ liệu nhạy cảm của học sinh vào công cụ AI.'
  },
  {
    id: 'quiz-q2',
    sectionIndex: 4,
    type: 'quiz',
    questionIndex: 1,
    title: 'Quy trình nào phù hợp nhất khi tạo bài thuyết trình từ một kế hoạch bài dạy bằng Gamma AI?',
    options: [
      'Dán nội dung hoặc dàn ý vào Gamma, chọn dạng Presentation và giao diện, tạo bản nháp, tinh chỉnh nội dung và hình ảnh, sau đó xuất tệp để kiểm tra.',
      'Chỉ nhập tên chủ đề, xuất tệp ngay và sử dụng nguyên trạng vì Gamma đã tự kiểm tra toàn bộ kiến thức.',
      'Thiết kế từng slide hoàn chỉnh trong PowerPoint trước, sau đó chỉ dùng Gamma để đổi màu nền.'
    ],
    isMultiSelect: false,
    correctAnswers: [0],
    reviewSection: 'Phần 2: AI cho tạo slide bài giảng',
    explanation: 'Gamma có thể tạo bản nháp từ dàn ý hoặc kế hoạch bài dạy. Giáo viên cần tinh chỉnh nội dung, bố cục và hình ảnh, rồi kiểm tra kỹ tệp đã xuất trước khi giảng dạy.'
  },
  {
    id: 'quiz-q3',
    sectionIndex: 4,
    type: 'quiz',
    questionIndex: 2,
    title: 'Những cách làm nào phù hợp khi tạo hình ảnh AI cho bài giảng? (Chọn các phương án đúng)',
    options: [
      'Tạo ảnh từ một mô tả chi tiết về nội dung, đối tượng và phong cách mong muốn.',
      'Tải phác thảo lên và yêu cầu AI chuyển thành hình ảnh hoàn chỉnh.',
      'Dùng prompt đảo ngược để AI phân tích hình mẫu, tạo prompt tương tự rồi điều chỉnh chi tiết.',
      'Mô phỏng người thật khi chưa được cho phép và sao chép nguyên phong cách cá nhân của một họa sĩ.'
    ],
    isMultiSelect: true,
    correctAnswers: [0, 1, 2],
    reviewSection: 'Phần 3: Dùng AI để tạo ảnh, tranh vẽ cho giảng dạy',
    explanation: 'Có thể tạo ảnh từ mô tả, từ phác thảo hoặc bằng prompt đảo ngược. Khi sử dụng ảnh AI, cần tôn trọng quyền riêng tư, bản quyền và dùng ngôn ngữ an toàn, phù hợp với môi trường giáo dục.'
  },
  {
    id: 'quiz-q4',
    sectionIndex: 4,
    type: 'quiz',
    questionIndex: 3,
    title: 'Những cặp công cụ và nhiệm vụ nào dưới đây được ghép đúng? (Chọn các phương án đúng)',
    options: [
      'Suno AI - tạo bài hát từ lời có sẵn và mô tả phong cách âm nhạc.',
      'Google AI Studio - tạo giọng đọc đơn hoặc hội thoại đa nhân vật từ kịch bản.',
      'Google NotebookLM - hỏi đáp theo tài liệu nguồn, tạo sơ đồ tư duy và Audio Overview.',
      'Gamma AI - kiểm chứng tự động mọi dữ kiện trong tài liệu và thay thế hoàn toàn việc rà soát của giáo viên.'
    ],
    isMultiSelect: true,
    correctAnswers: [0, 1, 2],
    reviewSection: 'Phần 3: AI cho tạo học liệu số đa phương tiện',
    explanation: 'Suno AI phù hợp để tạo bài hát; Google AI Studio tạo giọng đọc và hội thoại; NotebookLM tương tác với tài liệu nguồn, tạo sơ đồ tư duy và Audio Overview. Mọi sản phẩm AI vẫn cần được giáo viên kiểm tra.'
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
    title: 'Workshop trực tuyến nâng cao – Chủ đề 2',
    imagePath: 'youtube_ws2.png',
    content: `
      <div style="font-size: 0.98rem; line-height: 1.7;">
        <p style="margin-bottom: 1.25rem;">Sau khi hoàn thành Chủ đề 2 trên nền tảng TEMIS, thầy cô được mời tham gia buổi workshop trực tuyến nâng cao — nơi chúng ta cùng tiếp tục thảo luận nâng cao thực hành, đặt câu hỏi và chia sẻ kinh nghiệm trong chủ đề này.</p>

        <div class="info-card" style="border-left: 4px solid var(--accent); background-color: var(--bg-soft); padding: 1.25rem; margin-bottom: 1.5rem;">
          <h4 style="color: var(--brand); margin-bottom: 0.5rem; font-size: 1.05rem;"><strong>Thông tin chương trình Workshop 2:</strong></h4>
          <ul class="bullet-list" style="margin-top: 0.5rem; display: flex; flex-direction: column; gap: 0.4rem; padding-left: 0;">
            <li style="padding-left: 1.2rem; margin-bottom: 0;"><strong style="color: var(--brand);">Thời gian:</strong> 14:00 - 15:30</li>
            <li style="padding-left: 1.2rem; margin-bottom: 0;"><strong style="color: var(--brand);">Ngày diễn ra:</strong> 12 tháng 07 năm 2026</li>
            <li style="padding-left: 1.2rem; margin-bottom: 0;"><strong style="color: var(--brand);">Hình thức:</strong> Livestream trực tuyến</li>
          </ul>
        </div>
        
        <p style="font-style: italic; color: var(--ink-3); margin-top: 1rem;">*Thầy cô có thể sử dụng điện thoại để quét mã QR bên cạnh để truy cập nhanh liên kết livestream YouTube.</p>
      </div>
    `
  }
];

const UI_STRINGS = {
  btnPrev: 'Trước',
  btnNext: 'Tiếp theo',
  btnResources: 'Tài liệu',
  sidebarTitle: 'Mục lục khóa học',
  drawerTitle: 'Tài liệu học tập và tham khảo',
  progressLabel: 'hoàn thành',
  dragHint: 'Kéo thả các thẻ tính năng vào đúng cột hoặc nhấn chọn thẻ rồi nhấn chọn cột để di chuyển:',
  dragBucketSex: 'Công cụ Gamma AI',
  dragBucketGender: 'Công cụ Canva',
  gameReset: 'Làm lại',
  gameCheck: 'Kiểm tra',
  gameCongratulation: '🎉 Chúc mừng! Thầy cô đã phân loại chính xác thế mạnh của Gamma AI và Canva!',
  gameErrors: 'Vẫn còn một số tính năng bị đặt sai cột. Hãy kiểm tra lại!',
  startQuiz: 'Bắt đầu ngay',
  quizFeedbackTitleCorrect: 'Chính xác',
  quizFeedbackTitleIncorrect: 'Chưa chính xác',
  quizBtnSubmit: 'Gửi',
  scoreResult: 'Điểm số của thầy cô:',
  scoreRankGood: 'Tuyệt vời! Thầy cô đã hoàn thành xuất sắc bài kiểm tra! (Đạt)',
  scoreRankAverage: 'Thầy cô đã nắm được một phần nội dung nhưng chưa đạt mức 75%. Vui lòng ôn tập và thực hiện lại. (Chưa đạt)',
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
  const interactiveTypes = ['quiz'];
  const currentSection = sections[slide.sectionIndex];
  const quizSectionIdx = sections.findIndex(sec => sec.id === 'sec-quiz');
  const inQuizSection = slide.sectionIndex === quizSectionIdx;
  if (!currentSection?.alwaysUnlocked && !inQuizSection && !interactiveTypes.includes(slide.type)) {
    state.completedSlides.add(slide.id);
  }
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
      <a href="../module3_v1/index.html" class="btn btn-primary btn-icon-label" style="text-decoration:none;">
        <span>Chuyển sang Chủ đề 3</span>
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
    if (!isSectionUnlocked(slides[index].sectionIndex)) return;

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

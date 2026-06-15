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
  { id: 'sec-part1', title: 'Phần 1: AI cho kiểm tra đánh giá' },
  { id: 'sec-part2', title: 'Phần 2: AI cho tiêu chí đánh giá và giới hạn AI trong kiểm tra' },
  { id: 'sec-part3', title: 'Phần 3: AI cho tạo trò chơi, ứng dụng & mô phỏng' },
  { id: 'sec-part4', title: 'Phần 4: Nghiên cứu sâu & trình bày thông tin sinh động' },
  { id: 'sec-quiz',  title: 'Phần 5: Đánh giá và tổng kết', hideSubsections: true },
  { id: 'sec-next', title: 'Workshop trực tuyến nâng cao – Chủ đề 3', hideSubsections: true, alwaysUnlocked: true }
];

const slides = [
  // SECTION 0: INTRO
  {
    id: 'intro-welcome',
    sectionIndex: 0,
    type: 'intro',
    title: 'Nội dung chính',
    coverImage: '../home_ws3.png',
    content: `
      <div style="max-width:780px; margin: 0 auto;">
        <p style="font-size:1.05rem; margin-bottom:1.75rem; line-height:1.75; text-align:center;"><strong>Chủ đề 3 – Sử dụng AI trong thiết kế bài tập bổ trợ, kiểm tra đánh giá, và tạo các ứng dụng, trò chơi, mô phỏng hỗ trợ học tập</strong> hướng dẫn thầy cô sử dụng AI trong những tình huống giảng dạy thực tế. Thầy cô sẽ thực hành tạo câu hỏi tự luận, trắc nghiệm và rubric dựa trên mục tiêu học tập cùng tài liệu nguồn; xây dựng và kiểm chứng một mô phỏng tương tác; đồng thời nghiên cứu thông tin đa nguồn để tạo infographic phù hợp với học sinh. Xuyên suốt chủ đề, AI được sử dụng như công cụ hỗ trợ, còn giáo viên chịu trách nhiệm kiểm tra tính chính xác, phù hợp, công bằng và hiệu quả sư phạm trước khi áp dụng.</p>

        <div style="border-top: 1px solid var(--line); padding-top: 1.25rem; margin-bottom: 1.25rem;">
          <p style="font-size:0.78rem; font-weight:700; text-transform:uppercase; letter-spacing:0.07em; color:var(--ink-3); margin-bottom:0.85rem;">Mục tiêu chủ đề</p>
          <div style="display:flex; gap:1rem; flex-wrap:wrap;">
            <div style="flex:1; min-width:180px; display:flex; align-items:flex-start; gap:0.65rem; background:var(--bg-soft); border-radius:var(--border-radius-md); padding:0.85rem 1rem;">
              <span style="font-size:1.35rem; line-height:1; flex-shrink:0;">📝</span>
              <div>
                <div style="font-size:0.82rem; font-weight:700; color:var(--brand); margin-bottom:0.2rem;">Thiết kế kiểm tra đánh giá có căn cứ</div>
                <div style="font-size:0.82rem; color:var(--ink-2); line-height:1.45;">Tạo câu hỏi tự luận, trắc nghiệm và rubric từ mục tiêu học tập, tài liệu nguồn và prompt có cấu trúc; kiểm tra tính chính xác, phù hợp và công bằng trước khi sử dụng.</div>
              </div>
            </div>
            <div style="flex:1; min-width:180px; display:flex; align-items:flex-start; gap:0.65rem; background:var(--bg-soft); border-radius:var(--border-radius-md); padding:0.85rem 1rem;">
              <span style="font-size:1.35rem; line-height:1; flex-shrink:0;">🎮</span>
              <div>
                <div style="font-size:0.82rem; font-weight:700; color:var(--brand); margin-bottom:0.2rem;">Tạo mô phỏng phục vụ học tập</div>
                <div style="font-size:0.82rem; color:var(--ink-2); line-height:1.45;">Sử dụng Gemini Canvas để xây dựng, chạy thử và cải thiện một mô phỏng tương tác giúp học sinh dự đoán, quan sát và giải thích hiện tượng.</div>
              </div>
            </div>
            <div style="flex:1; min-width:180px; display:flex; align-items:flex-start; gap:0.65rem; background:var(--bg-soft); border-radius:var(--border-radius-md); padding:0.85rem 1rem;">
              <span style="font-size:1.35rem; line-height:1; flex-shrink:0;">🔍</span>
              <div>
                <div style="font-size:0.82rem; font-weight:700; color:var(--brand); margin-bottom:0.2rem;">Nghiên cứu và trình bày thông tin</div>
                <div style="font-size:0.82rem; color:var(--ink-2); line-height:1.45;">Dùng AI để tìm kiếm thông tin đa nguồn, kiểm chứng số liệu và chuyển kết quả đã xác nhận thành infographic phù hợp với học sinh.</div>
              </div>
            </div>
          </div>
        </div>

        <p style="text-align:center; color:var(--ink-3); font-size:0.85rem;"><strong>Thời lượng dự kiến:</strong> ~90 phút (60 phút video · 6 hoạt động)</p>
      </div>
    `
  },
  
  // SECTION 1: AI CHO KIỂM TRA ĐÁNH GIÁ
  {
    id: 'p1-overview',
    sectionIndex: 1,
    type: 'text',
    title: 'Vai trò của AI trong kiểm tra đánh giá',
    content: `
      <div style="font-size: 0.98rem; line-height: 1.7; max-width: 800px; margin: 0 auto;">
        <p style="margin-bottom: 1.25rem;">Trong kiểm tra đánh giá, AI có thể hỗ trợ giáo viên <strong>soạn thảo và rà soát sản phẩm ban đầu</strong>. Tuy nhiên, chất lượng đánh giá vẫn phụ thuộc vào mục tiêu học tập, tài liệu làm căn cứ và quyết định chuyên môn của giáo viên.</p>
        
        <ul class="bullet-list" style="margin-bottom: 1.5rem;">
          <li><strong>Soạn câu hỏi từ nội dung đã dạy:</strong> Tạo câu hỏi tự luận và trắc nghiệm dựa trên tệp bài học, mục tiêu đánh giá, đối tượng học sinh và thời gian làm bài.</li>
          <li><strong>Thiết kế prompt có cấu trúc:</strong> Làm rõ ngữ cảnh, hướng dẫn xử lý, dữ liệu làm căn cứ và yêu cầu đầu ra để hạn chế câu hỏi sai hoặc nằm ngoài phạm vi.</li>
          <li><strong>Xây dựng tiêu chí đánh giá:</strong> Hỗ trợ tạo rubric với các mức thể hiện có thể quan sát, trọng số hợp lý và ngôn ngữ giúp học sinh tự đánh giá.</li>
          <li><strong>Rà soát và cải thiện:</strong> Gợi ý phương án nhiễu, đáp án, thang điểm hoặc mô tả tiêu chí để giáo viên kiểm tra và chỉnh sửa.</li>
        </ul>
        
        <div class="info-card" style="border-left: 4px solid var(--accent); background-color: var(--bg-soft); padding: 1.25rem;">
          <h4 style="color: var(--brand); margin-bottom: 0.55rem; font-size: 1rem;"><strong>Nguyên tắc xuyên suốt</strong></h4>
          <p style="margin: 0; font-size: 0.9rem;">AI chỉ tạo bản nháp. Giáo viên phải đối chiếu từng câu hỏi và tiêu chí với tài liệu nguồn, mục tiêu học tập và điều kiện lớp học; kiểm tra tính chính xác, mức độ phù hợp và sự công bằng trước khi sử dụng. Giáo viên vẫn chịu trách nhiệm cuối cùng đối với hoạt động đánh giá và kết quả của học sinh.</p>
        </div>
      </div>
    `
  },
  {
    id: 'p1-video',
    sectionIndex: 1,
    type: 'video',
    title: 'AI cho kiểm tra đánh giá',
    videoUrl: 'https://www.youtube.com/embed/O6-10DWaj5s',
    content: `
      <div style="font-size: 0.98rem; line-height: 1.7; max-width: 800px; margin: 0 auto;">
        <div class="info-card" style="border-left: 4px solid var(--rmit-red); background-color: var(--bg-soft); padding: 1.25rem; border-radius: var(--border-radius-md); box-shadow: var(--shadow-sm);">
          <h4 style="color: var(--ink); margin-bottom: 0.75rem; font-weight: 700; font-size: 1.05rem;">Tóm tắt</h4>
          <ul class="bullet-list" style="margin: 0;">
            <li>AI có thể hỗ trợ giáo viên tạo câu hỏi, bài tập và đề kiểm tra đánh giá.</li>
            <li>AI có thể tạo nội dung dựa trên bài học và tài liệu do giáo viên cung cấp.</li>
            <li>Giáo viên luôn phải kiểm tra tính chính xác, hợp lý và mức độ phù hợp của nội dung đối với học sinh của mình.</li>
          </ul>
        </div>
      </div>
    `
  },
  {
    id: 'p1-essay-basic',
    sectionIndex: 1,
    type: 'text',
    title: 'Soạn câu hỏi tự luận với AI - Cách cơ bản',
    content: `
      <div style="font-size: 0.98rem; line-height: 1.7; max-width: 800px; margin: 0 auto;">
        <p style="margin-bottom: 1rem;">Trong thực tế, thầy cô nên bắt đầu từ <strong>mục tiêu cần đánh giá</strong> và <strong>nội dung học sinh đã học</strong>, thay vì chỉ yêu cầu AI “tạo một đề tự luận”. Ví dụ dưới đây dùng cho một bài kiểm tra ngắn sau khi học văn bản <em>Tây Tiến</em>.</p>
        
        <div class="info-card" style="border-left: 4px solid var(--rmit-red); background-color: var(--bg-soft); padding: 1.25rem; margin-bottom: 1.5rem;">
          <h4 style="color: var(--brand); margin-bottom: 0.65rem; font-size: 1.05rem;"><strong>Prompt mẫu cho tình huống lớp học:</strong></h4>
          <div style="background-color: #ffffff; border: 1px dashed var(--line-2); border-radius: var(--border-radius-sm); padding: 1rem; font-style: italic; color: var(--brand); line-height: 1.55;">
            "Bạn là giáo viên Ngữ văn lớp 12. Tôi cần một câu hỏi tự luận dùng trong bài kiểm tra 20 phút sau khi học văn bản <em>Tây Tiến</em> của Quang Dũng.<br><br>
            <strong>Mục tiêu đánh giá:</strong> Học sinh phân tích được chi tiết nghệ thuật và dẫn chứng để làm rõ vẻ đẹp bi tráng của hình tượng người lính Tây Tiến.<br>
            <strong>Dữ liệu:</strong> Chỉ sử dụng đoạn trích và nội dung bài học tôi cung cấp bên dưới. Không bổ sung chi tiết ngoài tài liệu.<br>
            <strong>Yêu cầu:</strong> Soạn 01 câu hỏi ở mức độ thông hiểu - vận dụng, phù hợp thời gian 20 phút; diễn đạt rõ ràng, không đánh đố. Kèm theo mục tiêu của câu hỏi, gợi ý các ý chính cần đạt và thang điểm 10 với tiêu chí cụ thể.<br><br>
            Trước khi trả lời, hãy cho biết nếu dữ liệu tôi cung cấp chưa đủ để tạo câu hỏi chính xác."
          </div>
        </div>

        <h4 style="margin-bottom: 0.5rem; font-size: 1rem;"><strong>Lệnh tiếp theo để điều chỉnh theo học sinh:</strong></h4>
        <div style="background-color: var(--bg-soft); border-left: 4px solid var(--rmit-red); border-radius: var(--border-radius-md); padding: 1rem 1.1rem; margin-bottom: 1.4rem; font-style: italic; color: var(--brand);">
          "Hãy rà soát câu hỏi vừa tạo cho lớp có năng lực không đồng đều. Giữ nguyên mục tiêu đánh giá, nhưng bổ sung 2 gợi ý định hướng ngắn cho học sinh cần hỗ trợ; không làm lộ đáp án."
        </div>

        <h4 style="margin-bottom: 0.45rem; font-size: 1rem;"><strong>Giáo viên kiểm chứng trước khi sử dụng:</strong></h4>
        <ul class="bullet-list" style="margin-top: 0;">
          <li><strong>Đúng mục tiêu:</strong> Câu hỏi thực sự đo năng lực phân tích, không chỉ yêu cầu học sinh nhớ lại kiến thức.</li>
          <li><strong>Đúng nội dung:</strong> Dẫn chứng, đáp án gợi ý và thang điểm phải phù hợp với văn bản, bài học và yêu cầu của chương trình.</li>
          <li><strong>Khả thi:</strong> Độ khó, cách diễn đạt và khối lượng bài làm phù hợp với học sinh và thời gian kiểm tra thực tế.</li>
        </ul>
      </div>
    `
  },
  {
    id: 'p1-quiz-basic',
    sectionIndex: 1,
    type: 'text',
    title: 'Soạn câu hỏi trắc nghiệm với AI - Cách cơ bản',
    content: `
      <div style="font-size: 0.98rem; line-height: 1.7; max-width: 800px; margin: 0 auto;">
        <p style="margin-bottom: 1rem;">Để câu hỏi bám sát nội dung học sinh đã học, thầy cô cần <strong>tải lên tệp bài học</strong> trước khi gửi yêu cầu cho AI. Ví dụ dưới đây dùng để tạo một bài kiểm tra ngắn sau khi học Unit 2 - <em>The Concert</em>.</p>
        
        <div class="info-card" style="border-left: 4px solid var(--accent); background-color: var(--bg-soft); padding: 1.25rem; margin-bottom: 1.5rem;">
          <h4 style="color: var(--brand); margin-bottom: 0.65rem; font-size: 1.05rem;"><strong>Bước 1: Tải lên tệp bài học</strong></h4>
          <p style="margin-bottom: 0.8rem;">Tải lên trang hoặc tệp PDF của Unit 2 - <em>The Concert</em> trong sách <em>Family and Friends 4 - Class Book</em>. Nếu dùng môn học khác, thầy cô tải lên đúng nội dung học sinh vừa học.</p>
          <h4 style="color: var(--brand); margin-bottom: 0.65rem; font-size: 1.05rem;"><strong>Bước 2: Gửi prompt</strong></h4>
          <div style="background-color: #ffffff; border: 1px dashed var(--line-2); border-radius: var(--border-radius-sm); padding: 1rem; font-style: italic; color: var(--brand); line-height: 1.55;">
            "Bạn là giáo viên tiếng Anh tiểu học đang dạy lớp 4. Dựa <strong>chỉ trên tệp tôi vừa tải lên</strong>, hãy tạo một bài kiểm tra nhanh 10 phút cho Unit 2 - <em>The Concert</em>.<br><br>
            <strong>Mục tiêu đánh giá:</strong> Học sinh nhận biết và sử dụng được từ vựng, mẫu câu trọng tâm trong bài.<br>
            <strong>Yêu cầu:</strong> Soạn 05 câu hỏi trắc nghiệm, mỗi câu có 4 phương án A, B, C, D và chỉ có 1 đáp án đúng. Phân bố 2 câu nhận biết, 2 câu thông hiểu và 1 câu vận dụng đơn giản. Các phương án nhiễu phải hợp lý, phù hợp với học sinh lớp 4.<br>
            <strong>Đầu ra:</strong> Trình bày từng câu hỏi, đáp án đúng, nội dung trong tệp làm căn cứ và giải thích ngắn gọn.<br><br>
            Nếu không đọc được tệp hoặc tệp chưa đủ thông tin, hãy báo lại thay vì tự bổ sung kiến thức bên ngoài."
          </div>
        </div>

        <h4 style="margin-bottom: 0.5rem; font-size: 1rem;"><strong>Lệnh tiếp theo để cải thiện câu hỏi:</strong></h4>
        <div style="background-color: var(--bg-soft); border-left: 4px solid var(--rmit-red); border-radius: var(--border-radius-md); padding: 1rem 1.1rem; margin-bottom: 1.4rem; font-style: italic; color: var(--brand);">
          "Hãy rà soát lại 5 câu hỏi: loại bỏ phương án quá dễ đoán, bảo đảm chỉ có một đáp án đúng và điều chỉnh ngôn ngữ phù hợp với học sinh lớp 4."
        </div>

        <h4 style="margin-bottom: 0.45rem; font-size: 1rem;"><strong>Giáo viên kiểm chứng trước khi sử dụng:</strong></h4>
        <ul class="bullet-list" style="margin-top: 0;">
          <li><strong>Đúng tài liệu:</strong> Nội dung câu hỏi và đáp án phải xuất hiện hoặc suy ra trực tiếp từ tệp đã tải lên.</li>
          <li><strong>Đúng kỹ thuật:</strong> Mỗi câu chỉ có một đáp án đúng; các phương án nhiễu hợp lý và không tạo manh mối ngoài ý muốn.</li>
          <li><strong>Phù hợp học sinh:</strong> Từ vựng, độ khó và thời gian làm bài phù hợp với lớp học thực tế.</li>
        </ul>
      </div>
    `
  },
  {
    id: 'p1-advanced-prompt-mapping',
    sectionIndex: 1,
    type: 'game-matching',
    title: 'Hoạt động: Phân tích cấu trúc prompt nâng cao',
    instruction: 'Đọc prompt tạo câu hỏi trắc nghiệm dưới đây. Sau đó, xác định vai trò của từng phần bằng cách chọn thành phần phù hợp.',
    promptPreview: `
      <span style="background-color: #FDECED; border-bottom: 2px solid #E61E2A; padding: 0.15rem 0.35rem; border-radius: 4px; font-weight: 500;">Bạn là giáo viên Khoa học lớp 4, có kinh nghiệm thiết kế câu hỏi đánh giá theo định hướng phát triển năng lực.</span><br><br>
      <span style="background-color: #E7F3EC; border-bottom: 2px solid #1A7D4F; padding: 0.15rem 0.35rem; border-radius: 4px; font-weight: 500;">Đọc kỹ tệp bài học được tải lên, xác định kiến thức trọng tâm và đối chiếu từng câu hỏi với mục tiêu bài học. Không sử dụng kiến thức ngoài tệp.</span><br><br>
      <span style="background-color: #FEF9E7; border-bottom: 2px solid #F39C12; padding: 0.15rem 0.35rem; border-radius: 4px; font-weight: 500;">Tệp đính kèm: Bài “Vòng tuần hoàn của nước”, gồm nội dung sách giáo khoa và mục tiêu bài học.</span><br><br>
      <span style="background-color: #EBF5FB; border-bottom: 2px solid #3498DB; padding: 0.15rem 0.35rem; border-radius: 4px; font-weight: 500;">Tạo 5 câu hỏi trắc nghiệm, mỗi câu có 4 phương án và chỉ 1 đáp án đúng: 2 câu nhận biết, 2 câu thông hiểu, 1 câu vận dụng. Trình bày đáp án, căn cứ trong tệp và giải thích ngắn cho từng câu.</span>
    `,
    matchingItems: [
      { id: 'm1', text: 'Bạn là giáo viên Khoa học lớp 4, có kinh nghiệm thiết kế câu hỏi đánh giá theo định hướng phát triển năng lực.', correct: 'context' },
      { id: 'm2', text: 'Đọc kỹ tệp bài học, xác định kiến thức trọng tâm, đối chiếu với mục tiêu và không dùng kiến thức ngoài tệp.', correct: 'instructions' },
      { id: 'm3', text: 'Tệp bài “Vòng tuần hoàn của nước”, gồm nội dung sách giáo khoa và mục tiêu bài học.', correct: 'data' },
      { id: 'm4', text: 'Tạo 5 câu trắc nghiệm theo ba mức độ; cung cấp đáp án, căn cứ và giải thích cho từng câu.', correct: 'output' }
    ],
    components: [
      { value: 'context', text: 'Ngữ cảnh - Vai trò, môn học và đối tượng' },
      { value: 'instructions', text: 'Hướng dẫn - Cách AI đọc và xử lý tài liệu' },
      { value: 'data', text: 'Dữ liệu - Tệp và nội dung làm căn cứ' },
      { value: 'output', text: 'Yêu cầu đầu ra - Sản phẩm và định dạng cần tạo' }
    ]
  },
  // SECTION 2: AI CHO TIÊU CHÍ ĐÁNH GIÁ VÀ GIỚI HẠN AI TRONG KIỂM TRA
  {
    id: 'p2-sec2-video',
    sectionIndex: 2,
    type: 'video',
    title: 'AI cho tiêu chí đánh giá và giới hạn AI trong kiểm tra',
    videoUrl: 'https://www.youtube.com/embed/Wl9ajus_ENM',
    content: `
      <div style="font-size: 0.98rem; line-height: 1.7; max-width: 800px; margin: 0 auto;">
        <div class="info-card" style="border-left: 4px solid var(--rmit-red); background-color: var(--bg-soft); padding: 1.25rem; border-radius: var(--border-radius-md); box-shadow: var(--shadow-sm);">
          <h4 style="color: var(--ink); margin-bottom: 0.75rem; font-weight: 700; font-size: 1.05rem;">Tóm tắt</h4>
          <ul class="bullet-list" style="margin: 0;">
            <li>AI có thể hỗ trợ giáo viên xây dựng tiêu chí đánh giá và thang mô tả mức độ đạt được cho sản phẩm học tập.</li>
            <li>Tiêu chí cần bám sát mục tiêu học tập, nhiệm vụ thực tế và đặc điểm của học sinh; giáo viên phải kiểm tra và điều chỉnh trước khi sử dụng.</li>
            <li>AI không thể thay thế nhận định chuyên môn của giáo viên, đặc biệt khi đánh giá quá trình, sự sáng tạo, cảm xúc và hoàn cảnh cụ thể của học sinh.</li>
          </ul>
        </div>
      </div>
    `
  },
  {
    id: 'p1-rubrics',
    sectionIndex: 2,
    type: 'text',
    title: 'Hoạt động: Thiết kế tiêu chí đánh giá với AI',
    content: `
      <div style="font-size: 0.98rem; line-height: 1.7; max-width: 800px; margin: 0 auto;">
        <p style="margin-bottom: 1rem;">Thầy cô sẽ sử dụng AI để xây dựng một bảng tiêu chí đánh giá cho <strong>sản phẩm trò chơi Scratch của học sinh</strong>. Rubric cần dựa trên mục tiêu học tập và yêu cầu nhiệm vụ thực tế, không chỉ là một bảng tiêu chí chung chung.</p>
        
        <div class="info-card" style="border-left: 4px solid var(--rmit-red); background-color: var(--bg-soft); padding: 1.25rem; margin-bottom: 1.5rem;">
          <h4 style="color: var(--brand); margin-bottom: 0.65rem; font-size: 1.05rem;"><strong>Bước 1: Tải lên tài liệu làm căn cứ</strong></h4>
          <p style="margin-bottom: 0.8rem;">Tải lên cho AI: (1) yêu cầu nhiệm vụ thiết kế trò chơi Scratch, (2) mục tiêu học tập và (3) sản phẩm mẫu nếu có. Có thể thay thế bằng nhiệm vụ thực tế trong môn học của thầy cô.</p>

          <h4 style="color: var(--brand); margin-bottom: 0.65rem; font-size: 1.05rem;"><strong>Bước 2: Gửi prompt thiết kế rubric</strong></h4>
          <div style="background-color: #ffffff; border: 1px dashed var(--line-2); border-radius: var(--border-radius-sm); padding: 1rem; font-style: italic; color: var(--brand); line-height: 1.55; font-size: 0.9rem;">
            "Bạn là giáo viên Tin học đang hướng dẫn học sinh thiết kế trò chơi Scratch để ôn tập kiến thức của một môn học khác.<br><br>
            Dựa <strong>chỉ trên yêu cầu nhiệm vụ và mục tiêu học tập trong các tệp tôi đã tải lên</strong>, hãy xây dựng bảng tiêu chí đánh giá sản phẩm.<br><br>
            <strong>Yêu cầu về tiêu chí:</strong><br>
            - Gồm 5 tiêu chí: độ chính xác của kiến thức, kỹ năng lập trình, chức năng và tương tác, thiết kế giao diện, tính sáng tạo và mức độ hoàn thiện.<br>
            - Mỗi tiêu chí có 4 mức: Vượt yêu cầu (4 điểm), Đạt tốt (3 điểm), Đạt một phần (2 điểm), Chưa đạt (1 điểm).<br>
            - Mô tả từng mức bằng hành vi hoặc đặc điểm có thể quan sát được; tránh từ ngữ mơ hồ như 'tốt', 'đẹp' hoặc 'sáng tạo' nếu không có biểu hiện cụ thể.<br>
            - Tổng điểm và trọng số phải phản ánh đúng mục tiêu quan trọng nhất của nhiệm vụ.<br><br>
            <strong>Đầu ra:</strong> Trình bày dạng bảng gồm tiêu chí, trọng số, mô tả 4 mức và căn cứ từ tệp. Dùng ngôn ngữ để học sinh có thể tự đánh giá trước khi nộp bài.<br><br>
            Nếu tài liệu chưa đủ để xây dựng tiêu chí, hãy nêu rõ thông tin cần bổ sung."
          </div>
        </div>

        <h4 style="margin-bottom: 0.5rem; font-size: 1rem;"><strong>Bước 3: Yêu cầu AI tự rà soát rubric</strong></h4>
        <div style="background-color: var(--bg-soft); border-left: 4px solid var(--rmit-red); border-radius: var(--border-radius-md); padding: 1rem 1.1rem; margin-bottom: 1.4rem; font-style: italic; color: var(--brand);">
          "Hãy kiểm tra lại rubric vừa tạo: mỗi mức có phân biệt rõ ràng không, tiêu chí có trùng lặp không, mô tả có quan sát và chấm được không, tổng trọng số có bằng 100% không? Sau đó đề xuất bản chỉnh sửa."
        </div>

        <h4 style="margin-bottom: 0.45rem; font-size: 1rem;"><strong>Giáo viên kiểm chứng trước khi sử dụng:</strong></h4>
        <ul class="bullet-list" style="margin-top: 0;">
          <li><strong>Đúng mục tiêu:</strong> Tiêu chí và trọng số tập trung vào những năng lực thực sự cần đánh giá trong nhiệm vụ.</li>
          <li><strong>Đo được:</strong> Mô tả từng mức sử dụng bằng chứng quan sát được và giúp hai người chấm hiểu tương đối thống nhất.</li>
          <li><strong>Công bằng:</strong> Rubric không chấm những yêu cầu học sinh chưa được hướng dẫn hoặc không có điều kiện thực hiện.</li>
          <li><strong>Dễ sử dụng:</strong> Học sinh có thể dùng rubric để tự kiểm tra sản phẩm; giáo viên có thể chấm và phản hồi trong thời gian thực tế.</li>
        </ul>
      </div>
    `
  },
  {
    id: 'p1-limits',
    sectionIndex: 2,
    type: 'accordion',
    title: 'Hoạt động phản tư: Khi đề kiểm tra do AI tạo gặp sự cố',
    accordionTitle: 'Tình huống: 10 phút trước giờ kiểm tra',
    accordionItems: [
      {
        title: '1. Sự cố trong lớp học',
        desc: 'Cô Lan dùng AI để tạo nhanh bài kiểm tra Khoa học lớp 6 từ tệp bài học và chỉ đọc lướt trước khi in. Khi học sinh đã bắt đầu làm bài, một em giơ tay và nói rằng câu 4 có hai đáp án đều đúng. Một em khác nhận ra câu 7 hỏi kiến thức chưa được học. Không khí lớp học trở nên căng thẳng; một số học sinh bắt đầu trao đổi đáp án, còn phụ huynh của một em đang chờ kết quả bài kiểm tra để quyết định việc học thêm.'
      },
      {
        title: '2. Thầy cô sẽ làm gì ngay lúc đó?',
        desc: '<strong>Hãy dừng lại và lựa chọn:</strong> (a) tiếp tục cho học sinh làm và điều chỉnh điểm sau; (b) hủy toàn bộ bài kiểm tra; hoặc (c) tạm dừng, xác nhận lỗi, loại các câu có vấn đề và giải thích cách xử lý công bằng cho cả lớp.<br><br><strong>Gợi ý phản tư:</strong> Quyết định nào bảo vệ tốt nhất quyền lợi học sinh? Thầy cô sẽ nói gì để học sinh vẫn tin tưởng vào hoạt động đánh giá? Những bằng chứng nào cần lưu lại trước khi sửa điểm?'
      },
      {
        title: '3. Điều gì đã sai?',
        desc: 'AI không hiểu đầy đủ phạm vi kiến thức đã dạy, có thể tạo phương án nhiễu thiếu chặt chẽ và không chịu trách nhiệm về hậu quả của điểm số. Cô Lan đã giao cho AI một nhiệm vụ có ảnh hưởng trực tiếp đến học sinh nhưng chưa kiểm tra từng câu với tài liệu nguồn, mục tiêu đánh giá và đáp án. Đây không chỉ là lỗi kỹ thuật; đó là vấn đề về tính hợp lệ, công bằng và trách nhiệm nghề nghiệp trong đánh giá.'
      },
      {
        title: '4. Cách xử lý và phòng ngừa',
        desc: '<strong>Trong lớp:</strong> Tạm dừng, thừa nhận vấn đề, loại hoặc sửa các câu không hợp lệ và bảo đảm không học sinh nào bị bất lợi. Nếu lỗi ảnh hưởng lớn đến kết quả, tổ chức đánh giá lại bằng hình thức phù hợp.<br><br><strong>Trước lần sau:</strong> Đối chiếu từng câu với nội dung đã dạy; tự làm thử đề; kiểm tra chỉ có một đáp án đúng; nhờ đồng nghiệp rà soát với bài kiểm tra quan trọng; kết hợp điểm số với quan sát, sản phẩm và trao đổi trực tiếp. AI chỉ hỗ trợ soạn thảo, giáo viên vẫn chịu trách nhiệm cuối cùng.'
      }
    ]
  },

  // SECTION 3: AI CHO TẠO TRÒ CHƠI, ỨNG DỤNG & MÔ PHỎNG
  {
    id: 'p3-sec3-video',
    sectionIndex: 3,
    type: 'video',
    title: 'AI cho tạo trò chơi, ứng dụng và mô phỏng',
    videoUrl: 'https://www.youtube.com/embed/gvFO0sJDTnE',
    content: `
      <div style="font-size: 0.98rem; line-height: 1.7; max-width: 800px; margin: 0 auto;">
        <div class="info-card" style="border-left: 4px solid var(--rmit-red); background-color: var(--bg-soft); padding: 1.25rem; border-radius: var(--border-radius-md); box-shadow: var(--shadow-sm);">
          <h4 style="color: var(--ink); margin-bottom: 0.75rem; font-weight: 700; font-size: 1.05rem;">Tóm tắt</h4>
          <ul class="bullet-list" style="margin: 0;">
            <li>AI có thể hỗ trợ giáo viên tạo nhanh trò chơi, ứng dụng và mô phỏng tương tác từ mô tả bằng ngôn ngữ tự nhiên.</li>
            <li>Một yêu cầu hiệu quả cần nêu rõ mục tiêu học tập, đối tượng học sinh, nội dung, cách tương tác và kết quả mong đợi.</li>
            <li>Giáo viên cần chạy thử, kiểm tra tính chính xác, khả năng sử dụng và mức độ phù hợp sư phạm trước khi đưa sản phẩm vào lớp học.</li>
          </ul>
        </div>
      </div>
    `
  },
  {
    id: 'p2-gemini',
    sectionIndex: 3,
    type: 'text',
    title: 'Hoạt động: Tạo mô phỏng vật lý với Gemini Canvas',
    content: `
      <div style="font-size: 0.98rem; line-height: 1.7; max-width: 800px; margin: 0 auto;">
        <p style="margin-bottom: 1rem;"><strong>Tình huống lớp học:</strong> Thầy Minh dạy Vật lý lớp 10 về chuyển động ném xiên. Học sinh nhớ công thức nhưng khó hình dung việc thay đổi góc ném và vận tốc ban đầu ảnh hưởng thế nào đến quỹ đạo. Thầy muốn tạo một mô phỏng đơn giản để học sinh dự đoán, thử nghiệm và giải thích kết quả ngay trong tiết học.</p>
        
        <div class="info-card" style="border-left: 4px solid var(--rmit-red); background-color: var(--bg-soft); padding: 1.25rem; margin-bottom: 1.5rem;">
          <h4 style="color: var(--brand); margin-bottom: 0.65rem; font-size: 1.05rem;"><strong>Nhiệm vụ thực hành</strong></h4>
          <ol style="margin-left: 1.5rem; display: flex; flex-direction: column; gap: 0.55rem; padding-left: 0; margin-bottom: 1rem;">
            <li>Mở Gemini và chọn <strong>Canvas</strong>.</li>
            <li>Gửi prompt dưới đây để tạo phiên bản đầu tiên.</li>
            <li>Chạy thử ít nhất ba trường hợp, ghi lại lỗi hoặc điểm chưa phù hợp.</li>
            <li>Gửi lệnh điều chỉnh và kiểm tra lại trước khi chia sẻ cho học sinh.</li>
          </ol>

          <h4 style="color: var(--brand); margin-bottom: 0.65rem; font-size: 1.05rem;"><strong>Prompt tạo mô phỏng</strong></h4>
          <div style="background-color: #ffffff; border: 1px dashed var(--line-2); border-radius: var(--border-radius-sm); padding: 1rem; font-style: italic; color: var(--brand); line-height: 1.55;">
            "Bạn là người thiết kế học liệu Vật lý lớp 10. Hãy tạo trong Canvas một mô phỏng tương tác đơn giản về chuyển động ném xiên, dùng trong hoạt động khám phá 15 phút.<br><br>
            <strong>Mục tiêu học tập:</strong> Học sinh dự đoán và giải thích được ảnh hưởng của góc ném và vận tốc ban đầu đến độ cao cực đại, tầm xa và hình dạng quỹ đạo.<br>
            <strong>Điều khiển:</strong> Hai thanh trượt cho góc ném từ 10° đến 80° và vận tốc từ 5 đến 30 m/s; nút Bắt đầu, Tạm dừng và Đặt lại.<br>
            <strong>Hiển thị:</strong> Vẽ quỹ đạo chuyển động; hiển thị thời gian bay, độ cao cực đại và tầm xa. Dùng g = 9,8 m/s² và bỏ qua sức cản không khí; ghi rõ giả định này trên màn hình.<br>
            <strong>Hoạt động học tập:</strong> Trước mỗi lần chạy, yêu cầu học sinh chọn dự đoán 'tăng', 'giảm' hoặc 'không đổi' cho tầm xa. Sau khi chạy, hiển thị kết quả để học sinh so sánh với dự đoán.<br>
            <strong>Thiết kế:</strong> Giao diện tiếng Việt, dễ đọc trên máy chiếu và máy tính; không dùng hiệu ứng hoặc âm thanh gây phân tán.<br><br>
            Hãy tạo bản chạy được trong Canvas và giải thích ngắn cách giáo viên sử dụng trong lớp."
          </div>
        </div>

        <h4 style="margin-bottom: 0.5rem; font-size: 1rem;"><strong>Lệnh điều chỉnh sau khi chạy thử:</strong></h4>
        <div style="background-color: var(--bg-soft); border-left: 4px solid var(--rmit-red); border-radius: var(--border-radius-md); padding: 1rem 1.1rem; margin-bottom: 1.4rem; font-style: italic; color: var(--brand);">
          "Hãy kiểm tra các phép tính bằng ít nhất ba bộ giá trị đầu vào. Sửa lỗi nếu kết quả không đúng công thức ném xiên. Sau đó bổ sung nút 'Hiện giải thích' để mô tả ngắn vì sao kết quả thay đổi, nhưng chỉ hiển thị sau khi học sinh đã chạy mô phỏng."
        </div>

        <h4 style="margin-bottom: 0.45rem; font-size: 1rem;"><strong>Giáo viên kiểm chứng trước khi sử dụng:</strong></h4>
        <ul class="bullet-list" style="margin-top: 0;">
          <li><strong>Đúng khoa học:</strong> Đối chiếu kết quả với công thức hoặc tính tay một số trường hợp; kiểm tra đơn vị và giả định mô hình.</li>
          <li><strong>Đúng mục tiêu:</strong> Mô phỏng buộc học sinh dự đoán, quan sát và giải thích thay vì chỉ bấm nút xem hiệu ứng.</li>
          <li><strong>Dễ sử dụng:</strong> Các nút, thanh trượt và thông tin hiển thị rõ ràng; mô phỏng hoạt động ổn định trên thiết bị lớp học.</li>
          <li><strong>Có phương án dự phòng:</strong> Chuẩn bị ảnh chụp hoặc bảng dữ liệu mẫu nếu mạng hoặc Canvas không hoạt động trong tiết học.</li>
        </ul>
      </div>
    `
  },
  {
    id: 'p2-practice',
    sectionIndex: 3,
    type: 'text',
    title: 'Hoạt động: Tạo mô phỏng dạy học',
    content: `
      <div style="font-size: 0.98rem; line-height: 1.7; max-width: 800px; margin: 0 auto;">
        <p style="margin-bottom: 1.25rem;">Thầy cô hãy lựa chọn thực hành thiết kế một ứng dụng mô phỏng hoặc trò chơi học tập bằng AI:</p>
        
        <div class="info-card" style="border-left: 4px solid var(--rmit-red); background-color: var(--bg-soft); margin-bottom: 1.5rem; padding: 1.25rem;">
          <h4 style="color: var(--brand); margin-bottom: 0.5rem; font-size: 1.05rem;"><strong>Nhiệm vụ thực hành tự chọn (15 phút):</strong></h4>
          <ul style="margin-left: 1.5rem; margin-top: 0.3rem; margin-bottom: 0; display: flex; flex-direction: column; gap: 0.6rem; padding-left: 0;">
            <li style="padding-left: 0.5rem;"><strong>Lựa chọn 1 (Canva AI):</strong> Tạo trò chơi kéo thả phân loại rác hữu cơ/vô cơ hoặc mô phỏng hoạt hình chu trình nước. Xuất bản thành trang web Canva để học sinh làm bài trên điện thoại/máy tính.</li>
            <li style="padding-left: 0.5rem;"><strong>Lựa chọn 2 (Gemini Canvas):</strong> Nhập vai giáo viên môn Khoa học tự nhiên/Vật lý/Hóa học, yêu cầu Gemini Canvas tạo mô phỏng tương tác (ví dụ: mô phỏng dao động con lắc, mô phỏng phản ứng hóa học cơ bản). Lấy liên kết chia sẻ Canvas gửi lên nhóm học tập.</li>
          </ul>
        </div>
      </div>
    `
  },

  // SECTION 4: NGHIÊN CỨU SÂU & TRÌNH BÀY THÔNG TIN SINH ĐỘNG
  {
    id: 'p4-sec4-video',
    sectionIndex: 4,
    type: 'video',
    title: 'Nghiên cứu sâu và trình bày thông tin sinh động với AI',
    videoUrl: 'https://www.youtube.com/embed/jqvpS2vqrT8',
    content: `
      <div style="font-size: 0.98rem; line-height: 1.7; max-width: 800px; margin: 0 auto;">
        <div class="info-card" style="border-left: 4px solid var(--rmit-red); background-color: var(--bg-soft); padding: 1.25rem; border-radius: var(--border-radius-md); box-shadow: var(--shadow-sm);">
          <h4 style="color: var(--ink); margin-bottom: 0.75rem; font-weight: 700; font-size: 1.05rem;">Tóm tắt</h4>
          <ul class="bullet-list" style="margin: 0;">
            <li>AI có thể hỗ trợ giáo viên lập kế hoạch tìm kiếm, tổng hợp thông tin từ nhiều nguồn và trình bày kết quả theo cấu trúc rõ ràng.</li>
            <li>Một yêu cầu nghiên cứu tốt cần xác định câu hỏi, phạm vi, thời gian, đối tượng học sinh, tiêu chí lựa chọn nguồn và sản phẩm đầu ra.</li>
            <li>Giáo viên phải mở và kiểm tra nguồn gốc của số liệu, loại bỏ thông tin không đáng tin cậy, rồi biên tập nội dung và hình thức trình bày trước khi sử dụng.</li>
          </ul>
        </div>
      </div>
    `
  },
  {
    id: 'p3-practice-wash',
    sectionIndex: 4,
    type: 'text',
    title: 'Hoạt động: Nghiên cứu và tạo infographic cho học sinh THCS',
    content: `
      <div style="font-size: 0.98rem; line-height: 1.7; max-width: 800px; margin: 0 auto;">
        <p style="margin-bottom: 1rem;"><strong>Tình huống lớp học:</strong> Cô Hương chuẩn bị bài Địa lý lớp 8 về rác thải nhựa tại Việt Nam. Học sinh thường gặp nhiều số liệu khác nhau trên mạng và khó nhận biết nguồn nào đáng tin cậy. Cô muốn dùng AI để nghiên cứu thông tin cập nhật, sau đó tạo một infographic một trang làm học liệu khởi động và thảo luận trên lớp.</p>
        
        <div class="info-card" style="border-left: 4px solid var(--rmit-red); background-color: var(--bg-soft); padding: 1.25rem; margin-bottom: 1.5rem;">
          <h4 style="color: var(--brand); margin-bottom: 0.65rem; font-size: 1.05rem;"><strong>Nhiệm vụ thực hành</strong></h4>
          <ol style="margin-left: 1.5rem; display: flex; flex-direction: column; gap: 0.55rem; padding-left: 0; margin-bottom: 1rem;">
            <li>Bật tính năng nghiên cứu sâu trong công cụ AI thầy cô đang sử dụng.</li>
            <li>Gửi prompt nghiên cứu và xem kế hoạch tìm kiếm do AI đề xuất.</li>
            <li>Kiểm tra ít nhất ba nguồn chính và xác nhận các số liệu được chọn.</li>
            <li>Yêu cầu AI chuyển nội dung đã kiểm chứng thành infographic cho học sinh THCS.</li>
          </ol>

          <h4 style="color: var(--brand); margin-bottom: 0.65rem; font-size: 1.05rem;"><strong>Prompt nghiên cứu và thiết kế infographic</strong></h4>
          <div style="background-color: #ffffff; border: 1px dashed var(--line-2); border-radius: var(--border-radius-sm); padding: 1rem; font-style: italic; color: var(--brand); line-height: 1.55; font-size: 0.9rem;">
            "Bạn là trợ lý nghiên cứu cho giáo viên Địa lý lớp 8. Hãy nghiên cứu chủ đề <strong>rác thải nhựa tại Việt Nam và tác động đến môi trường</strong> để tạo học liệu cho hoạt động thảo luận 15 phút.<br><br>
            <strong>Phạm vi:</strong> Tìm số liệu và thông tin được công bố trong giai đoạn 2022-2026 về lượng rác thải nhựa, nguồn phát sinh chính, tác động đến sông và biển, cùng hai giải pháp học sinh THCS có thể thực hiện.<br>
            <strong>Nguồn ưu tiên:</strong> Cơ quan nhà nước Việt Nam, Liên Hợp Quốc, World Bank, tổ chức nghiên cứu hoặc trường đại học. Không dùng bài quảng cáo, blog không rõ tác giả hoặc số liệu không có nguồn gốc.<br>
            <strong>Kiểm chứng:</strong> Với mỗi số liệu, cung cấp tên tổ chức, năm, liên kết trực tiếp và đoạn thông tin làm căn cứ. Nếu các nguồn đưa số liệu khác nhau, hãy nêu rõ thay vì tự chọn một con số.<br>
            <strong>Đầu ra nghiên cứu:</strong> Tóm tắt tối đa 500 từ, gồm 5-7 thông tin quan trọng và danh sách nguồn.<br>
            <strong>Đầu ra trực quan:</strong> Sau phần tóm tắt, xây dựng nội dung cho infographic dọc một trang bằng tiếng Việt, dành cho học sinh lớp 8. Infographic gồm tiêu đề, 3-4 số liệu nổi bật, nguyên nhân, tác động, hai hành động thiết thực và nguồn viết ngắn ở cuối. Dùng câu ngắn, dễ đọc; không tạo hình ảnh gây hiểu sai số liệu."
          </div>
        </div>
        
        <h4 style="margin-bottom: 0.5rem; font-size: 1rem;"><strong>Lệnh tiếp theo sau khi kiểm tra nguồn:</strong></h4>
        <div style="background-color: var(--bg-soft); border-left: 4px solid var(--rmit-red); border-radius: var(--border-radius-md); padding: 1rem 1.1rem; margin-bottom: 1.4rem; font-style: italic; color: var(--brand);">
          "Tôi đã xác nhận các nguồn số [ghi số thứ tự]. Chỉ sử dụng những thông tin đã được xác nhận để tạo infographic. Hãy loại bỏ mọi số liệu còn mâu thuẫn hoặc không mở được nguồn, đồng thời giữ phần nguồn ở cuối infographic."
        </div>

        <h4 style="margin-bottom: 0.45rem; font-size: 1rem;"><strong>Giáo viên kiểm chứng trước khi sử dụng:</strong></h4>
        <ul class="bullet-list" style="margin-top: 0;">
          <li><strong>Nguồn truy cập được:</strong> Mở từng liên kết và kiểm tra đúng tổ chức, ngày công bố, phạm vi và ngữ cảnh của số liệu.</li>
          <li><strong>Không bóp méo dữ liệu:</strong> Infographic không cắt bỏ đơn vị, mốc thời gian hoặc điều kiện khiến số liệu mang ý nghĩa khác.</li>
          <li><strong>Phù hợp học sinh:</strong> Ngôn ngữ vừa sức, bố cục dễ đọc và không tạo cảm giác hoảng sợ hoặc quy trách nhiệm đơn giản hóa.</li>
          <li><strong>Có nhiệm vụ học tập:</strong> Dùng infographic để học sinh đặt câu hỏi, so sánh nguồn hoặc đề xuất hành động, không chỉ xem thụ động.</li>
        </ul>
      </div>
    `
  },

  // SECTION 5: ĐÁNH GIÁ VÀ TỔNG KẾT
  {
    id: 'quiz-start',
    sectionIndex: 5,
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
    sectionIndex: 5,
    type: 'quiz',
    questionIndex: 0,
    title: 'Một giáo viên yêu cầu AI tạo 5 câu hỏi trắc nghiệm từ tệp bài học vừa tải lên. Cách làm nào giúp bộ câu hỏi đáng tin cậy nhất?',
    options: [
      'Yêu cầu AI tự chọn nội dung quan trọng và dùng thêm kiến thức trên internet để câu hỏi phong phú hơn.',
      'Nêu mục tiêu, đối tượng, thời gian và mức độ câu hỏi; yêu cầu AI chỉ dùng tệp, cung cấp đáp án cùng căn cứ, sau đó giáo viên đối chiếu từng câu.',
      'Tạo thật nhiều câu hỏi, sau đó chọn ngẫu nhiên 5 câu để tiết kiệm thời gian.'
    ],
    isMultiSelect: false,
    correctAnswers: [1],
    explanation: 'Câu hỏi cần bám mục tiêu và tài liệu nguồn. Căn cứ cho từng đáp án giúp giáo viên kiểm tra, nhưng giáo viên vẫn phải đối chiếu và chịu trách nhiệm trước khi sử dụng.'
  },
  {
    id: 'quiz-q2',
    sectionIndex: 5,
    type: 'quiz',
    questionIndex: 1,
    title: 'Khi dùng AI tạo rubric cho sản phẩm học tập, những yêu cầu nào giúp rubric rõ ràng và công bằng? (Chọn các phương án đúng)',
    options: [
      'Dựa trên mục tiêu học tập và yêu cầu nhiệm vụ đã cung cấp cho học sinh.',
      'Mô tả từng mức bằng hành vi hoặc đặc điểm có thể quan sát được.',
      'Chấm thêm những kỹ năng học sinh chưa được hướng dẫn để khuyến khích các em tự tìm hiểu.',
      'Kiểm tra trọng số, sự trùng lặp giữa các tiêu chí và khả năng học sinh dùng rubric để tự đánh giá.'
    ],
    isMultiSelect: true,
    correctAnswers: [0, 1, 3],
    explanation: 'Rubric phải bám mục tiêu và nhiệm vụ, sử dụng mô tả quan sát được, có trọng số hợp lý và không đánh giá những yêu cầu học sinh chưa được học hoặc chưa có điều kiện thực hiện.'
  },
  {
    id: 'quiz-q3',
    sectionIndex: 5,
    type: 'quiz',
    questionIndex: 2,
    title: 'Trước khi dùng một mô phỏng ném xiên do Gemini Canvas tạo trong lớp Vật lý, giáo viên cần làm gì? (Chọn các phương án đúng)',
    options: [
      'Thử nhiều bộ giá trị và đối chiếu kết quả với công thức hoặc tính toán độc lập.',
      'Kiểm tra đơn vị, giả định vật lý, nút điều khiển và khả năng hoạt động trên thiết bị lớp học.',
      'Chỉ cần giao diện hấp dẫn; AI đã viết mã nên không cần kiểm tra kết quả.',
      'Chuẩn bị ảnh chụp hoặc bảng dữ liệu dự phòng nếu công cụ không hoạt động.'
    ],
    isMultiSelect: true,
    correctAnswers: [0, 1, 3],
    explanation: 'Mô phỏng phải đúng khoa học, rõ ràng và ổn định. Giáo viên cần kiểm tra độc lập và có phương án dự phòng trước khi dùng trong một hoạt động học tập thực tế.'
  },
  {
    id: 'quiz-q4',
    sectionIndex: 5,
    type: 'quiz',
    questionIndex: 3,
    title: 'AI đã nghiên cứu rác thải nhựa và đề xuất số liệu cho một infographic lớp 8. Giáo viên nên làm gì trước khi sử dụng sản phẩm?',
    options: [
      'Mở các nguồn chính, kiểm tra tổ chức, năm, phạm vi, đơn vị và ngữ cảnh của từng số liệu; chỉ dùng thông tin đã xác nhận.',
      'Giữ mọi số liệu AI tìm được để infographic trông thuyết phục và đầy đủ hơn.',
      'Chỉ kiểm tra thiết kế và màu sắc vì phần nghiên cứu đã được AI hoàn thành.',
      'Loại toàn bộ phần nguồn để infographic ngắn gọn hơn.'
    ],
    isMultiSelect: false,
    correctAnswers: [0],
    explanation: 'Giáo viên cần mở và kiểm tra nguồn, ngữ cảnh và đơn vị của số liệu. Infographic chỉ nên sử dụng thông tin đã xác nhận và phải giữ phần nguồn để học sinh có thể truy vết.'
  },
  {
    id: 'quiz-score-summary',
    sectionIndex: 5,
    type: 'summary',
    title: 'Kết quả bài kiểm tra'
  },
  {
    id: 'quiz-next-steps',
    sectionIndex: 6,
    type: 'text-image',
    title: 'Workshop trực tuyến nâng cao – Chủ đề 3',
    imagePath: 'youtube_ws3.png',
    content: `
      <div style="font-size: 0.98rem; line-height: 1.7;">
        <p style="margin-bottom: 1.25rem;">Sau khi hoàn thành Chủ đề 3 trên nền tảng TEMIS, thầy cô được mời tham gia buổi workshop trực tuyến nâng cao — nơi chúng ta cùng tiếp tục thảo luận nâng cao thực hành, đặt câu hỏi và chia sẻ kinh nghiệm trong chủ đề này.</p>

        <div class="info-card" style="border-left: 4px solid var(--accent); background-color: var(--bg-soft); padding: 1.25rem; margin-bottom: 1.5rem;">
          <h4 style="color: var(--brand); margin-bottom: 0.5rem; font-size: 1.05rem;"><strong>Thông tin chương trình Workshop 3:</strong></h4>
          <ul class="bullet-list" style="margin-top: 0.5rem; display: flex; flex-direction: column; gap: 0.4rem; padding-left: 0;">
            <li style="padding-left: 1.2rem; margin-bottom: 0;"><strong style="color: var(--brand);">Thời gian:</strong> 14:00 - 15:30</li>
            <li style="padding-left: 1.2rem; margin-bottom: 0;"><strong style="color: var(--brand);">Ngày diễn ra:</strong> 19 tháng 07 năm 2026</li>
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
  dragBucketSex: 'Canva AI (Viết code cho tôi)',
  dragBucketGender: 'Gemini Canvas',
  gameReset: 'Làm lại',
  gameCheck: 'Kiểm tra',
  gameCongratulation: '🎉 Chúc mừng! Thầy cô đã phân loại chính xác thế mạnh của Canva AI và Gemini Canvas!',
  gameErrors: 'Vẫn còn một số tính năng bị đặt sai cột. Hãy kiểm tra lại!',
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
  const interactiveTypes = ['game-matching', 'quiz'];
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
      <a href="../module4_v1/index.html" class="btn btn-primary btn-icon-label" style="text-decoration:none;">
        <span>Chuyển sang Chủ đề 4</span>
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
      <p style="margin-bottom: 1.25rem;">${slide.instruction || 'Quan sát prompt mẫu và ghép từng đoạn với thành phần phù hợp.'}</p>
      
      <!-- Colored sentence preview box -->
      <div class="prompt-preview-box" style="line-height: 1.75; font-size: 1rem; padding: 1.5rem; background: var(--bg-soft); border-radius: var(--border-radius-lg); text-align: left; margin-bottom: 1.75rem; border: 1px solid var(--line); color: var(--ink);">
        ${slide.promptPreview || ''}
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
          Thầy cô vui lòng chọn thành phần phù hợp cho tất cả ${slide.matchingItems.length} đoạn văn bản!
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

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
  { id: 'sec-part1', title: 'Phần 1: Giới thiệu về Chatbot và xây dựng Chatbot cơ bản' },
  { id: 'sec-part2', title: 'Phần 2: Chatbot nâng cao và quản lý lớp học với chatbot' },
  { id: 'sec-part3', title: 'Phần 3: Tự động hoá & hệ thống AI đa tác tử (Multi-Agent AI)' },
  { id: 'sec-quiz',  title: 'Phần 4: Đánh giá và tổng kết', hideSubsections: true },
  { id: 'sec-next', title: 'Workshop trực tuyến nâng cao – Chủ đề 4', hideSubsections: true, alwaysUnlocked: true }
];

const slides = [
  // SECTION 0: INTRO
  {
    id: 'intro-welcome',
    sectionIndex: 0,
    type: 'intro',
    title: 'Nội dung chính',
    coverImage: '../home_ws4.png',
    content: `
      <div style="max-width:780px; margin: 0 auto;">
        <p style="font-size:1.05rem; margin-bottom:1.75rem; line-height:1.75; text-align:center;"><strong>Chủ đề 4 – Ứng dụng AI tự động hoá các tác vụ hỗ trợ giảng dạy, học tập và quản lý giáo dục</strong> hướng dẫn thầy cô cách xây dựng chatbot trợ giảng thông minh bằng Google Gemini và Magic School AI, thiết lập phòng học ảo an toàn cho học sinh ôn tập, đồng thời giới thiệu nguyên lý hoạt động và định hướng lập kế hoạch ứng dụng Tác tử AI (AI Agent) tự động hóa các tác vụ chuyên môn, hành chính hàng ngày.</p>

        <div style="border-top: 1px solid var(--line); padding-top: 1.25rem; margin-bottom: 1.25rem;">
          <p style="font-size:0.78rem; font-weight:700; text-transform:uppercase; letter-spacing:0.07em; color:var(--ink-3); margin-bottom:0.85rem;">Mục tiêu chủ đề</p>
          <div style="display:flex; gap:1rem; flex-wrap:wrap;">
            <div style="flex:1; min-width:180px; display:flex; align-items:flex-start; gap:0.65rem; background:var(--bg-soft); border-radius:var(--border-radius-md); padding:0.85rem 1rem;">
              <span style="font-size:1.35rem; line-height:1; flex-shrink:0;">🤖</span>
              <div>
                <div style="font-size:0.82rem; font-weight:700; color:var(--brand); margin-bottom:0.2rem;">Tạo Chatbot trợ giảng</div>
                <div style="font-size:0.82rem; color:var(--ink-2); line-height:1.45;">Thiết kế chatbot ôn tập môn học bằng Google Gemini (Gems) dựa trên tài liệu tri thức làm căn cứ và tuân thủ các chỉ dẫn sư phạm gợi mở.</div>
              </div>
            </div>
            <div style="flex:1; min-width:180px; display:flex; align-items:flex-start; gap:0.65rem; background:var(--bg-soft); border-radius:var(--border-radius-md); padding:0.85rem 1rem;">
              <span style="font-size:1.35rem; line-height:1; flex-shrink:0;">🏫</span>
              <div>
                <div style="font-size:0.82rem; font-weight:700; color:var(--brand); margin-bottom:0.2rem;">Quản lý lớp học tương tác</div>
                <div style="font-size:0.82rem; color:var(--ink-2); line-height:1.45;">Tự tạo chatbot đóng vai (Ban giám khảo phỏng vấn) và phân phối an toàn đến học sinh thông qua phòng học ảo (Rooms) trên Magic School AI.</div>
              </div>
            </div>
            <div style="flex:1; min-width:180px; display:flex; align-items:flex-start; gap:0.65rem; background:var(--bg-soft); border-radius:var(--border-radius-md); padding:0.85rem 1rem;">
              <span style="font-size:1.35rem; line-height:1; flex-shrink:0;">⚙️</span>
              <div>
                <div style="font-size:0.82rem; font-weight:700; color:var(--brand); margin-bottom:0.2rem;">Tự động hóa & AI Agent</div>
                <div style="font-size:0.82rem; color:var(--ink-2); line-height:1.45;">Hiểu nguyên lý hoạt động của AI Agent (Tác tử AI), so sánh với chatbot, và lập kế hoạch quy trình tự động hóa công việc bằng no-code.</div>
              </div>
            </div>
          </div>
        </div>

        <p style="text-align:center; color:var(--ink-3); font-size:0.85rem;"><strong>Thời lượng dự kiến:</strong> ~70 phút (50 phút video · 4 hoạt động)</p>
      </div>
    `
  },
  
  // SECTION 1: GIỚI THIỆU & XÂY DỰNG CHATBOT CƠ BẢN
  {
    id: 'p1-video',
    sectionIndex: 1,
    type: 'video',
    title: 'Giới thiệu về Chatbot và xây dựng Chatbot cơ bản',
    videoUrl: 'https://www.youtube-nocookie.com/embed/tetl4qw8rkg',
    content: `
      <div class="info-card" style="border-left: 4px solid var(--rmit-red); background-color: var(--bg-soft); padding: 1.25rem; border-radius: var(--border-radius-md); max-width: 720px; margin: 1.5rem auto 0; box-shadow: var(--shadow-sm);">
        <h4 style="color: var(--ink); margin-bottom: 0.75rem; font-weight: 700; font-size: 1.05rem;">Tóm tắt</h4>
        <ul class="bullet-list" style="margin-top: 0; padding-left: 0; font-size: 0.95rem;">
          <li>Chatbot có thể đóng vai trò hỗ trợ đắc lực cho giáo viên hỗ trợ giáo viên tối ưu hóa vận hành (giải đáp câu hỏi thường gặp từ phụ huynh/học sinh 24/7).</li>
          <li>Khi tạo ra chatbot, luôn tránh cài đặt chatbot đưa đáp án trực tiếp khi hướng dẫn học sinh; thay vào đó sử dụng câu hỏi gợi mở để học sinh tự tìm lời giải.</li>
        </ul>
      </div>
    `
  },
  {
    id: 'p1-gemini-gems',
    sectionIndex: 1,
    type: 'text',
    title: 'Hoạt động: Tạo chatbot với Gemini làm trợ giảng cho lớp học',
    content: `
      <div style="font-size: 0.98rem; line-height: 1.7; max-width: 800px; margin: 0 auto;">
        <p style="margin-bottom: 1.25rem;"><strong>Tình huống:</strong> Thầy cô sẽ sử dụng Google Gemini để xây dựng một chatbot trợ giảng ảo phục vụ dạy và học. Trợ giảng ảo cần dựa trên tài liệu tri thức làm căn cứ và tuân thủ các nguyên tắc sư phạm trong chỉ dẫn hệ thống (ví dụ: xây dựng chatbot trợ giảng môn Vật lý lớp 7 để hỗ trợ học sinh ôn tập Chương 1 - Quang học từ tài liệu tri thức 'Vatly7.pdf', đóng vai trò trợ giảng gợi mở và không đưa đáp án trực tiếp).</p>
        
        <div class="info-card" style="border-left: 4px solid var(--rmit-red); background-color: var(--bg-soft); padding: 1.5rem; border-radius: var(--border-radius-md); box-shadow: var(--shadow-sm); margin-bottom: 1.5rem;">
          <h4 style="color: var(--ink); margin-bottom: 0.75rem; font-weight: 700; font-size: 1.05rem;">Bước 1: Tải lên tài liệu làm căn cứ (Tri thức)</h4>
          <p style="margin-bottom: 1rem; color: var(--text-secondary);">Chuẩn bị tài liệu chuyên môn chính thống (ví dụ: tệp <code>Vatly7.pdf</code> trích từ SGK Vật lý 7 hiện hành) và tải lên làm cơ sở tri thức để chatbot trả lời chính xác, tránh bịa đặt thông tin.</p>
          
          <h4 style="color: var(--ink); margin-bottom: 0.75rem; font-weight: 700; font-size: 1.05rem;">Bước 2: Gửi prompt thiết lập hành vi chatbot (Chỉ dẫn hệ thống)</h4>
          <div style="background-color: #ffffff; border: 1.5px dashed var(--line-2); border-radius: var(--border-radius-sm); padding: 1rem; font-style: italic; color: var(--brand); line-height: 1.5; font-size: 0.9rem; margin-bottom: 1rem;">
            "Bạn là một trợ giảng ảo chuyên hỗ trợ giáo viên và học sinh môn Vật lý lớp 7 tại Việt Nam. Nhiệm vụ chính của bạn là giúp học sinh ôn tập các kiến thức thuộc Chương 1 – Quang học, dựa trên nội dung trong tài liệu đính kèm có tên 'Vatly7.pdf'.<br><br>
            Khi học sinh đặt câu hỏi, bạn cần trả lời rõ ràng, chính xác, ngắn gọn, phù hợp với trình độ học sinh lớp 7. Giải thích khái niệm bằng ngôn ngữ đơn giản, có ví dụ thực tế minh họa nếu cần.<br><br>
            Khi học sinh hỏi đáp án trực tiếp các bài tập, TUYỆT ĐỐI không đưa ra ngay đáp án. Thay vào đó, hướng dẫn học sinh tư duy từng bước, gợi ý phương pháp hoặc đặt câu hỏi gợi mở để học sinh tự tìm ra lời giải."
          </div>
        </div>

        <div style="margin-bottom: 1.5rem; background-color: var(--brand-tint); border: 1px solid var(--brand-tint-2); padding: 0.8rem 1rem; border-radius: var(--border-radius-md); font-size: 0.9rem;">
          <strong>Thử nghiệm &amp; Tinh chỉnh:</strong> Sau khi thực hiện 2 bước trên, thầy cô tiến hành trò chuyện thử nghiệm với chatbot để đánh giá hiệu quả và tinh chỉnh thêm nếu cần thiết.
        </div>

        <h4 style="color: var(--ink); margin-bottom: 0.5rem; font-weight: 700; font-size: 1.05rem;">Giáo viên kiểm chứng trước khi sử dụng:</h4>
        <ul class="bullet-list" style="margin-top: 0.3rem; padding-left: 0;">
          <li style="margin-bottom: 0.5rem;"><strong>Đúng mục tiêu sư phạm:</strong> Đảm bảo chatbot đóng vai trò gợi mở, hướng dẫn tư duy thay vì làm hộ bài tập cho học sinh.</li>
          <li style="margin-bottom: 0.5rem;"><strong>Kiểm soát tri thức:</strong> Giới hạn phạm vi trả lời của chatbot trong tài liệu đính kèm để kiểm soát chất lượng nội dung.</li>
        </ul>
      </div>
    `
  },

  // SECTION 2: CHATBOT NÂNG CAO & QUẢN LÝ LỚP HỌC
  {
    id: 'p2-video',
    sectionIndex: 2,
    type: 'video',
    title: 'Chatbot nâng cao và quản lý lớp học với chatbot',
    videoUrl: 'https://www.youtube-nocookie.com/embed/7KDZw0maDgY',
    content: `
      <div class="info-card" style="border-left: 4px solid var(--rmit-red); background-color: var(--bg-soft); padding: 1.25rem; border-radius: var(--border-radius-md); max-width: 720px; margin: 1.5rem auto 0; box-shadow: var(--shadow-sm);">
        <h4 style="color: var(--ink); margin-bottom: 0.75rem; font-weight: 700; font-size: 1.05rem;">Tóm tắt</h4>
        <ul class="bullet-list" style="margin-top: 0; padding-left: 0; font-size: 0.95rem;">
          <li style="margin-bottom: 0.5rem;">Chatbot có thể được tạo và tùy chỉnh nâng cao để làm nhiều tác vụ khác nhau trong cùng một nền tảng. Ví dụ: Magic School AI cung cấp các chatbot hữu ích như soạn bài (Lesson Planning), tạo bài kiểm tra (MCQ Assessment), slide thuyết trình (Presentation).</li>
          <li style="margin-bottom: 0.5rem;">Bên cạnh đó, giáo viên có thể thiết lập các chatbot nhập vai (như Ban giám khảo, nhân vật lịch sử, gia sư) phục vụ các hoạt động học tập thực tế và tương tác cao.</li>
          <li style="margin-bottom: 0.5rem;">Công cụ AI hiện đại cho phép giáo viên quản lý và phân phối chatbot đến học sinh, giám sát sử dụng và phân tích số liệu trong quản lý lớp học.</li>
        </ul>
      </div>
    `
  },
  {
    id: 'p2-custom-chatbot',
    sectionIndex: 2,
    type: 'text',
    title: 'Hoạt động: Tạo chatbot Magic School AI đóng vai làm Ban giám khảo phỏng vấn',
    content: `
      <div style="font-size: 0.98rem; line-height: 1.7; max-width: 800px; margin: 0 auto;">
        <p style="margin-bottom: 1.25rem;"><strong>Tình huống:</strong> Thầy cô sẽ sử dụng Custom Chatbot của Magic School AI để thiết kế các chatbot nhập vai phục vụ dạy và học. Các chatbot này cần tuân thủ đúng ngữ cảnh đóng vai và luật tương tác sư phạm (ví dụ: tạo một trợ lý ảo đóng vai Ban giám khảo phỏng vấn học bổng để giúp học sinh THPT rèn luyện kỹ năng giao tiếp và tự tin trả lời phỏng vấn).</p>
        
        <div class="info-card" style="border-left: 4px solid var(--rmit-red); background-color: var(--bg-soft); padding: 1.5rem; border-radius: var(--border-radius-md); box-shadow: var(--shadow-sm); margin-bottom: 1.5rem;">
          <h4 style="color: var(--ink); margin-bottom: 0.75rem; font-weight: 700; font-size: 1.05rem;">Bước 1: Cấu hình hồ sơ chatbot</h4>
          <p style="margin-bottom: 1rem; color: var(--text-secondary);">Truy cập công cụ <strong>Custom Chatbot</strong> trên Magic School AI, đặt tên chatbot (ví dụ: Giám khảo phỏng vấn học bổng) và tải ảnh đại diện phù hợp.</p>
          
          <h4 style="color: var(--ink); margin-bottom: 0.75rem; font-weight: 700; font-size: 1.05rem;">Bước 2: Gửi prompt thiết lập hành vi đóng vai (Chỉ dẫn hệ thống)</h4>
          <div style="background-color: #ffffff; border: 1.5px dashed var(--line-2); border-radius: var(--border-radius-sm); padding: 1rem; font-style: italic; color: var(--brand); line-height: 1.5; font-size: 0.9rem; margin-bottom: 1rem;">
            "Bạn là Hiệu trưởng của một trường trung học phổ thông ở Việt Nam. Bạn được mời làm Ban giám khảo một chương trình học bổng uy tín. Bạn đang phỏng vấn trực tiếp một học sinh trung học để tìm hiểu về năng lực học thuật, khả năng sáng tạo và kỹ năng giải quyết vấn đề của em đó.<br><br>
            Quy tắc tương tác: Mỗi lần chỉ đặt duy nhất một câu hỏi ngắn gọn và tham gia đối thoại tự nhiên, lắng nghe câu trả lời rồi mới hỏi câu tiếp theo."
          </div>

          <h4 style="color: var(--ink); margin-bottom: 0.75rem; font-weight: 700; font-size: 1.05rem;">Bước 3: Tạo phòng học ảo (Rooms) để chia sẻ</h4>
          <p style="margin-bottom: 0; color: var(--text-secondary);">Tạo phòng học ảo (Room) trên Magic School AI, chọn đưa chatbot Giám khảo vừa tạo vào phòng học và chia sẻ liên kết trực tiếp hoặc mã QR để học sinh truy cập an toàn mà không cần tạo tài khoản.</p>
        </div>

        <div style="margin-bottom: 1.5rem; background-color: var(--brand-tint); border: 1px solid var(--brand-tint-2); padding: 0.8rem 1rem; border-radius: var(--border-radius-md); font-size: 0.9rem;">
          <strong>Thử nghiệm &amp; Tinh chỉnh:</strong> Sau khi thiết lập các bước trên, thầy cô tiến hành thử nghiệm trò chuyện đóng vai với chatbot để đánh giá hiệu quả và tinh chỉnh lại câu lệnh nếu cần thiết.
        </div>

        <h4 style="color: var(--ink); margin-bottom: 0.5rem; font-weight: 700; font-size: 1.05rem;">Giáo viên kiểm chứng trước khi sử dụng:</h4>
        <ul class="bullet-list" style="margin-top: 0.3rem; padding-left: 0;">
          <li style="margin-bottom: 0.5rem;"><strong>Hành vi nhập vai:</strong> Kiểm thử chatbot đối thoại xem có duy trì vai giám khảo nghiêm túc, giọng điệu chuyên nghiệp và không đặt nhiều câu hỏi cùng lúc.</li>
          <li style="margin-bottom: 0.5rem;"><strong>Theo dõi sư phạm:</strong> Kiểm tra tiến trình hoạt động của học sinh trong phòng học để kịp thời giải đáp và điều chỉnh.</li>
        </ul>
      </div>
    `
  },

  // SECTION 3: TỰ ĐỘNG HOÁ & HỆ THỐNG AI ĐA TÁC TỬ
  {
    id: 'p3-agent-concept',
    sectionIndex: 3,
    type: 'text',
    title: 'Tác tử AI (AI Agent) là gì?',
    content: `
      <div style="font-size: 0.98rem; line-height: 1.7; max-width: 850px; margin: 0 auto;">
        <p style="margin-bottom: 1.5rem; text-align: center;"><strong>AI Agent (Tác tử AI)</strong> là bước tiến hóa vượt trội tiếp theo của AI tạo sinh. Không chỉ trò chuyện đơn thuần, tác tử AI có thể tự chủ lập kế hoạch, ghi nhớ ngữ cảnh dài hạn và sử dụng các công cụ để giải quyết mục tiêu phức tạp.</p>

        <!-- 4 Core Pillars of AI Agent -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
          <div class="info-card" style="padding: 1rem; text-align: center; border-top: 4px solid var(--accent-blue); background-color: var(--bg-soft); margin: 0;">
            <div style="font-size: 1.5rem; margin-bottom: 0.25rem;">🧠</div>
            <h5 style="margin: 0.25rem 0; font-weight: 700; color: var(--brand); font-size: 0.95rem;">Bộ não (LLM)</h5>
            <p style="font-size: 0.8rem; color: var(--text-secondary); margin: 0; line-height: 1.4;">Khả năng suy luận, lập luận và đưa ra các quyết định hành động.</p>
          </div>
          <div class="info-card" style="padding: 1rem; text-align: center; border-top: 4px solid var(--accent-emerald); background-color: var(--bg-soft); margin: 0;">
            <div style="font-size: 1.5rem; margin-bottom: 0.25rem;">📋</div>
            <h5 style="margin: 0.25rem 0; font-weight: 700; color: var(--brand); font-size: 0.95rem;">Lập kế hoạch</h5>
            <p style="font-size: 0.8rem; color: var(--text-secondary); margin: 0; line-height: 1.4;">Tự chia nhỏ mục tiêu phức tạp thành các bước hành động cụ thể.</p>
          </div>
          <div class="info-card" style="padding: 1rem; text-align: center; border-top: 4px solid var(--accent-purple); background-color: var(--bg-soft); margin: 0;">
            <div style="font-size: 1.5rem; margin-bottom: 0.25rem;">💾</div>
            <h5 style="margin: 0.25rem 0; font-weight: 700; color: var(--brand); font-size: 0.95rem;">Bộ nhớ</h5>
            <p style="font-size: 0.8rem; color: var(--text-secondary); margin: 0; line-height: 1.4;">Lưu giữ ngữ cảnh hội thoại, tài liệu tri thức và kết quả thực thi.</p>
          </div>
          <div class="info-card" style="padding: 1rem; text-align: center; border-top: 4px solid var(--rmit-red); background-color: var(--bg-soft); margin: 0;">
            <div style="font-size: 1.5rem; margin-bottom: 0.25rem;">🛠️</div>
            <h5 style="margin: 0.25rem 0; font-weight: 700; color: var(--brand); font-size: 0.95rem;">Công cụ</h5>
            <p style="font-size: 0.8rem; color: var(--text-secondary); margin: 0; line-height: 1.4;">Kết nối thế giới thực để tra cứu web, gửi email, cập nhật bảng biểu...</p>
          </div>
        </div>

        <h4 style="color: var(--brand); text-align: center; margin-bottom: 1rem; font-weight: 700; font-size: 1.05rem;">So sánh qua ví dụ sư phạm: Ôn tập Chương 1 - Quang học môn Vật lý</h4>
        
        <div class="grid-2col" style="align-items: stretch; gap: 1.5rem;">
          <div class="info-card" style="display: flex; flex-direction: column; height: 100%; border-left: 4px solid var(--accent-emerald); background-color: #ffffff; padding: 1.25rem; margin: 0; box-shadow: var(--shadow-sm);">
            <h3 style="color:var(--accent-emerald); margin-bottom: 0.75rem; font-size: 1.05rem; font-weight: 700;">Chatbot thông thường</h3>
            <ul class="bullet-list" style="font-size:0.88rem; flex-grow: 1; padding-left: 0; margin-top: 0;">
              <li style="margin-bottom: 0.5rem; padding-left: 1.1rem;"><strong>Cách hoạt động:</strong> Thụ động phản hồi theo từng lượt hỏi - đáp của học sinh (stateless).</li>
              <li style="margin-bottom: 0.5rem; padding-left: 1.1rem;"><strong>Ví dụ sư phạm:</strong> Học sinh hỏi <i>"Thế nào là ảnh ảo của một vật tạo bởi gương phẳng?"</i>, chatbot trả lời định nghĩa theo sách giáo khoa Vật lý 7 rồi dừng lại chờ câu hỏi tiếp theo.</li>
              <li style="margin-bottom: 0.5rem; padding-left: 1.1rem;"><strong>Giới hạn:</strong> Không tự giao bài tập củng cố, không theo dõi tiến độ và không gửi email cập nhật cho giáo viên.</li>
            </ul>
          </div>
          
          <div class="info-card" style="display: flex; flex-direction: column; height: 100%; border-left: 4px solid var(--accent-purple); background-color: #ffffff; padding: 1.25rem; margin: 0; box-shadow: var(--shadow-sm);">
            <h3 style="color:var(--accent-purple); margin-bottom: 0.75rem; font-size: 1.05rem; font-weight: 700;">Tác tử AI (AI Agent)</h3>
            <ul class="bullet-list" style="font-size:0.88rem; flex-grow: 1; padding-left: 0; margin-top: 0;">
              <li style="margin-bottom: 0.5rem; padding-left: 1.1rem;"><strong>Cách hoạt động:</strong> Chủ động lập kế hoạch và phối hợp hành động đa bước để đạt mục tiêu giảng dạy được giao.</li>
              <li style="margin-bottom: 0.5rem; padding-left: 1.1rem;"><strong>Ví dụ sư phạm:</strong> Giáo viên giao mục tiêu: <i>"Đánh giá và hỗ trợ lớp ôn tập Chương 1"</i>. Agent tự động:
                <ul style="padding-left: 1.2rem; margin-top: 0.25rem; font-size: 0.82rem; list-style-type: circle;">
                  <li style="margin-bottom: 0.2rem;">Chủ động đặt câu hỏi ôn tập cho từng học sinh dựa trên tài liệu đính kèm.</li>
                  <li style="margin-bottom: 0.2rem;">Tự động tra cứu Google tìm ví dụ thực tế phù hợp nếu học sinh trả lời sai.</li>
                  <li style="margin-bottom: 0.2rem;">Ghi nhớ điểm số, tự động tạo email báo cáo danh sách học sinh cần hỗ trợ gửi cho giáo viên.</li>
                </ul>
              </li>
              <li style="margin-bottom: 0.5rem; padding-left: 1.1rem;"><strong>Ưu điểm:</strong> Vận hành quy trình tự động hóa khép kín, hỗ trợ đắc lực hoạt động dạy và quản lý lớp học.</li>
            </ul>
          </div>
        </div>
      </div>
    `
  },
  {
    id: 'p3-video',
    sectionIndex: 3,
    type: 'video',
    title: 'Tự động hoá & hệ thống AI đa tác tử (Multi-Agent AI)',
    videoUrl: 'https://www.youtube-nocookie.com/embed/Sr7W4JeqYsU',
    content: `
      <div class="info-card" style="border-left: 4px solid var(--rmit-red); background-color: var(--bg-soft); padding: 1.25rem; border-radius: var(--border-radius-md); max-width: 720px; margin: 1.5rem auto 0; box-shadow: var(--shadow-sm);">
        <h4 style="color: var(--ink); margin-bottom: 0.75rem; font-weight: 700; font-size: 1.05rem;">Tóm tắt</h4>
        <ul class="bullet-list" style="margin-top: 0; padding-left: 0; font-size: 0.95rem;">
          <li style="margin-bottom: 0.5rem;">AI Agent có khả năng tự lập kế hoạch hoạt động dựa trên bối cảnh và mục tiêu đề ra. AI Agent có thể sử dụng công cụ phần mềm để hoàn tất tác vụ được yêu cầu.</li>
          <li style="margin-bottom: 0.5rem;">Mô hình Multi-Agent (Đa tác tử): Nhiều tác tử AI chuyên biệt cộng tác và kiểm tra chéo công việc của nhau để hoàn thành quy trình nghiệp vụ tự động hóa.</li>
          <li style="margin-bottom: 0.5rem;">Mô hình Multi-Agent hỗ trợ đắc lực trong tự động hóa các tác vụ hành chính, quản lý học sinh và thống kê giáo dục.</li>
        </ul>
      </div>
    `
  },

  {
    id: 'p3-sorting-game',
    sectionIndex: 3,
    type: 'game-sex-gender',
    title: 'Hoạt động: Phân loại Chatbot vs AI Agent',
    leftBucketName: 'Chatbot',
    rightBucketName: 'AI Tác tử (AI Agent)',
    gameItems: [
      { id: 'item1', label: 'Hoạt động chủ yếu trong cuộc trò chuyện hỏi - đáp một lượt', category: 'left', feedback: 'Chính xác! Chatbot hoạt động chủ yếu để giải đáp trực tiếp theo lượt tương tác.' },
      { id: 'item2', label: 'Tự phân chia nhiệm vụ phức tạp thành các bước nhỏ để đạt mục tiêu', category: 'right', feedback: 'Chính xác! Khả năng tự lập kế hoạch hành động đa bước là đặc tính cốt lõi của AI Agent.' },
      { id: 'item3', label: 'Thụ động đợi người dùng nhập lệnh mới phản hồi, không tự hành động', category: 'left', feedback: 'Chính xác! Chatbot thông thường không tự chủ động thực hiện hành động nếu không có lệnh.' },
      { id: 'item4', label: 'Kết hợp mô hình LLM với các công cụ ngoài, bộ nhớ và engine điều phối', category: 'right', feedback: 'Chính xác! Đây là cấu trúc nâng cao giúp AI Agent tương tác với các hệ thống bên ngoài.' },
      { id: 'item5', label: 'Tự động hóa toàn bộ quy trình gửi email nhắc nhở khi phát hiện học sinh vắng', category: 'right', feedback: 'Chính xác! Tác vụ tự động hóa quy trình đa bước theo sự kiện là thế mạnh của AI Agent.' },
      { id: 'item6', label: 'Giải đáp thắc mắc tuyển sinh 24/7 dựa trên tài liệu đính kèm', category: 'left', feedback: 'Chính xác! Trợ lý trả lời câu hỏi dựa trên tài liệu là ứng dụng chatbot kinh điển.' }
    ]
  },
  {
    id: 'p3-agent-planning',
    sectionIndex: 3,
    type: 'text',
    title: 'Hoạt động: Lên ý tưởng và lập kế hoạch xây dựng tác tử AI (AI Agent)',
    content: `
      <div style="font-size: 0.98rem; line-height: 1.7; max-width: 850px; margin: 0 auto;">
        <p style="margin-bottom: 1.5rem; text-align: center;">Để đưa lý thuyết vào thực tế giảng dạy, thầy cô hãy cùng lên ý tưởng thiết kế một Tác tử AI (AI Agent) tự động hóa quy trình công việc giảng dạy và quản lý qua các bước định hướng dưới đây:</p>

        <!-- 3 Pillars of Planning -->
        <div class="grid-2col" style="align-items: stretch; gap: 1.5rem; margin-bottom: 1.5rem;">
          <div class="info-card" style="display: flex; flex-direction: column; height: 100%; border-left: 4px solid var(--accent-blue); background-color: var(--bg-soft); margin: 0; padding: 1.25rem; box-shadow: var(--shadow-sm);">
            <h4 style="color: var(--brand); margin-bottom: 0.5rem; font-weight: 700; font-size: 1.05rem;">1. Xác định Dạng ứng dụng &amp; Dữ liệu nguồn</h4>
            <ul class="bullet-list" style="font-size: 0.88rem; padding-left: 0; margin: 0; flex-grow: 1;">
              <li style="margin-bottom: 0.5rem; padding-left: 1.1rem;"><strong>Dạng ứng dụng:</strong> Chọn một quy trình lặp đi lặp lại cần tự động hóa (Ví dụ: tự động nhắc nhở học tập qua email, chấm điểm và viết nhận xét tự động, tổng hợp tài liệu chuyên đề).</li>
              <li style="margin-bottom: 0.5rem; padding-left: 1.1rem;"><strong>Dữ liệu có sẵn:</strong> Xác định nguồn thông tin làm căn cứ cho Agent (Ví dụ: bảng điểm Excel/Google Sheets, tệp PDF tài liệu môn học, biểu mẫu đăng ký của phụ huynh).</li>
            </ul>
          </div>

          <div class="info-card" style="display: flex; flex-direction: column; height: 100%; border-left: 4px solid var(--accent-emerald); background-color: var(--bg-soft); margin: 0; padding: 1.25rem; box-shadow: var(--shadow-sm);">
            <h4 style="color: var(--brand); margin-bottom: 0.5rem; font-weight: 700; font-size: 1.05rem;">2. Các nền tảng hỗ trợ (Không cần Code)</h4>
            <ul class="bullet-list" style="font-size: 0.88rem; padding-left: 0; margin: 0; flex-grow: 1;">
              <li style="margin-bottom: 0.5rem; padding-left: 1.1rem;"><strong>Coze / Dify.ai / Flowise:</strong> Các nền tảng cho phép kéo thả thiết kế quy trình xử lý, kết hợp mô hình ngôn ngữ lớn (LLM) với bộ nhớ RAG và công cụ ngoài.</li>
              <li style="margin-bottom: 0.5rem; padding-left: 1.1rem;"><strong>Zapier / Make.com / n8n:</strong> Các công cụ liên kết mạnh mẽ giúp kết nối LLM với các ứng dụng hàng ngày như Gmail, Google Sheets, Google Drive, Docs.</li>
            </ul>
          </div>
        </div>

        <!-- Implementation Checklist -->
        <div class="info-card" style="border-left: 4px solid var(--rmit-red); background-color: #ffffff; padding: 1.5rem; border-radius: var(--border-radius-md); box-shadow: var(--shadow-sm); margin-bottom: 1.5rem;">
          <h4 style="color: var(--ink); margin-bottom: 0.75rem; font-weight: 700; font-size: 1.05rem;">📋 Checklist lập kế hoạch triển khai của thầy cô:</h4>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.2rem; font-size: 0.88rem; line-height: 1.5;">
            <div>
              <div style="margin-bottom: 0.6rem; display: flex; align-items: flex-start; gap: 0.5rem;">
                <input type="checkbox" style="margin-top: 0.2rem; transform: scale(1.15); cursor: pointer;" />
                <span><strong>Bước 1:</strong> Xác định rõ kết quả đầu ra mong muốn (Ví dụ: File nhận xét kết quả học tập gửi cho phụ huynh).</span>
              </div>
              <div style="margin-bottom: 0.6rem; display: flex; align-items: flex-start; gap: 0.5rem;">
                <input type="checkbox" style="margin-top: 0.2rem; transform: scale(1.15); cursor: pointer;" />
                <span><strong>Bước 2:</strong> Chuẩn bị tài nguyên dữ liệu đầu vào làm cơ sở tri thức (Ví dụ: File bảng điểm và bộ tiêu chí nhận xét).</span>
              </div>
            </div>
            
            <div>
              <div style="margin-bottom: 0.6rem; display: flex; align-items: flex-start; gap: 0.5rem;">
                <input type="checkbox" style="margin-top: 0.2rem; transform: scale(1.15); cursor: pointer;" />
                <span><strong>Bước 3:</strong> Chọn công cụ liên kết &amp; Trình kích hoạt (Ví dụ: Bắt đầu khi xuất hiện dòng mới trên Google Sheets).</span>
              </div>
              <div style="margin-bottom: 0.6rem; display: flex; align-items: flex-start; gap: 0.5rem;">
                <input type="checkbox" style="margin-top: 0.2rem; transform: scale(1.15); cursor: pointer;" />
                <span><strong>Bước 4:</strong> Thiết lập prompt chỉ dẫn hành vi xử lý của tác tử và tiến hành chạy thử nghiệm quy mô nhỏ.</span>
              </div>
            </div>
          </div>
        </div>

        <p style="font-style: italic; font-size: 0.9rem; text-align: center; color: var(--text-secondary); margin-top: 0.5rem;">*Thầy cô có thể tích chọn vào các ô checkbox trên để lên kế hoạch chuẩn bị và lập ý tưởng trực tiếp.</p>
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
    title: 'Khi xây dựng một chatbot trợ giảng ảo bằng Google Gemini, hai yếu tố cốt lõi nào cần được cấu hình để đảm bảo chatbot trả lời chính xác thông tin chuyên môn và tuân thủ định hướng sư phạm?',
    options: [
      'Lựa chọn giao diện nền tối và đặt tên hiển thị thật nổi bật cho chatbot.',
      'Tải lên tài liệu làm căn cứ tri thức (Knowledge) và thiết lập câu lệnh chỉ dẫn hệ thống (System Instructions).',
      'Đăng ký tài khoản premium trả phí và tắt tính năng chia sẻ hội thoại với học sinh.'
    ],
    isMultiSelect: false,
    correctAnswers: [1],
    explanation: 'Để chatbot trợ giảng hoạt động hiệu quả, giáo viên cần cấu hình: 1. Tri thức nền tảng (Tải lên tài liệu tài liệu học liệu chính thống làm căn cứ trả lời) và 2. Chỉ dẫn hệ thống (Prompt quy định quy tắc sư phạm và cách dẫn dắt học sinh).'
  },
  {
    id: 'quiz-q2',
    sectionIndex: 4,
    type: 'quiz',
    questionIndex: 1,
    title: 'Khi viết chỉ dẫn (Instructions) cho Chatbot "Trợ lý ôn tập môn học" cho học sinh, nguyên tắc sư phạm nào sau đây cần được tuân thủ?',
    options: [
      'Cung cấp ngay đáp án chính xác và lời giải chi tiết để học sinh sao chép nhanh nhất.',
      'Không đưa ra ngay đáp án trực tiếp mà hướng dẫn tư duy từng bước, đặt câu hỏi gợi mở để học sinh tự tìm ra lời giải.',
      'Từ chối trả lời tất cả các câu hỏi bài tập và yêu cầu học sinh tự đọc sách giáo khoa.'
    ],
    isMultiSelect: false,
    correctAnswers: [1],
    explanation: 'Nhằm thúc đẩy năng lực tự học và tư duy của học sinh, chatbot trợ lý ôn tập cần đóng vai trò dẫn dắt, gợi mở và hướng dẫn tư duy từng bước thay vì làm hộ bài tập.'
  },
  {
    id: 'quiz-q3',
    sectionIndex: 4,
    type: 'quiz',
    questionIndex: 2,
    title: 'Nền tảng Magic School AI cung cấp những tính năng và công cụ nào hỗ trợ đắc lực cho giáo viên? (Chọn các phương án đúng)',
    options: [
      'Các chatbot tạo sẵn hỗ trợ soạn kế hoạch bài dạy (Lesson Planning) và tạo câu hỏi trắc nghiệm (MCQ Assessment).',
      'Cho phép tự tạo Custom Chatbot theo nhu cầu sư phạm riêng biệt (ví dụ đóng vai phỏng vấn học bổng).',
      'Hỗ trợ tạo phòng học ảo (Rooms) để học sinh truy cập và tương tác an toàn với Chatbot.',
      'Tự động chấm điểm bài kiểm tra tự luận viết tay của học sinh qua chụp ảnh điện thoại.'
    ],
    isMultiSelect: true,
    correctAnswers: [0, 1, 2],
    explanation: 'Magic School AI cung cấp các công cụ soạn giảng tạo sẵn, tính năng tự tạo Custom Chatbot đóng vai và cơ chế quản lý phòng học (Rooms) an toàn cho học sinh. Tính năng chấm điểm bài tự luận viết tay không được hỗ trợ.'
  },
  {
    id: 'quiz-q4',
    sectionIndex: 4,
    type: 'quiz',
    questionIndex: 3,
    title: 'Điểm khác biệt cốt lõi giúp AI Agent (Tác tử AI) vượt trội hơn một Chatbot thông thường là gì? (Chọn các phương án đúng)',
    options: [
      'AI Agent có tính tự chủ cao, có khả năng tự lập kế hoạch và phân chia một nhiệm vụ phức tạp thành các bước nhỏ để thực hiện.',
      'AI Agent có thể kết hợp sử dụng các công cụ bên ngoài (như gửi email, tra cứu web) và ghi nhớ ngữ cảnh dài hạn.',
      'AI Agent luôn đảm bảo thông tin chính xác 100% và không bao giờ bị ảo tưởng dữ liệu.',
      'AI Agent có thể chạy tự động theo lịch trình hoặc sự kiện để xử lý công việc mà không cần con người liên tục nhập lệnh.'
    ],
    isMultiSelect: true,
    correctAnswers: [0, 1, 3],
    explanation: 'AI Agent nổi bật nhờ khả năng tự chủ lập kế hoạch, sử dụng công cụ ngoài và chạy tự động. Tuy nhiên, do vẫn dựa trên các mô hình ngôn ngữ lớn (LLM), AI Agent vẫn có nguy cơ ảo tưởng dữ liệu và cần giáo viên giám sát.'
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
    title: 'Workshop trực tuyến nâng cao – Chủ đề 4',
    imagePath: 'youtube_ws4.png',
    content: `
      <div style="font-size: 0.98rem; line-height: 1.7;">
        <p style="margin-bottom: 1.25rem;">Sau khi hoàn thành Chủ đề 4 trên nền tảng TEMIS, thầy cô được mời tham gia buổi workshop trực tuyến nâng cao — nơi chúng ta cùng tiếp tục thảo luận nâng cao thực hành, đặt câu hỏi và chia sẻ kinh nghiệm trong chủ đề này.</p>

        <div class="info-card" style="border-left: 4px solid var(--accent); background-color: var(--bg-soft); padding: 1.25rem; margin-bottom: 1.5rem;">
          <h4 style="color: var(--brand); margin-bottom: 0.5rem; font-size: 1.05rem;"><strong>Thông tin chương trình Workshop 4:</strong></h4>
          <ul class="bullet-list" style="margin-top: 0.5rem; display: flex; flex-direction: column; gap: 0.4rem; padding-left: 0;">
            <li style="padding-left: 1.2rem; margin-bottom: 0;"><strong style="color: var(--brand);">Thời gian:</strong> 14:00 - 15:30</li>
            <li style="padding-left: 1.2rem; margin-bottom: 0;"><strong style="color: var(--brand);">Ngày diễn ra:</strong> 26 tháng 07 năm 2026</li>
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
  dragHint: 'Kéo thả các thẻ đặc điểm vào đúng cột hoặc nhấn chọn thẻ rồi nhấn chọn cột để di chuyển:',
  dragBucketSex: 'Chatbot',
  dragBucketGender: 'AI Tác tử (AI Agent)',
  gameReset: 'Làm lại',
  gameCheck: 'Kiểm tra',
  gameCongratulation: '🎉 Chúc mừng! Thầy cô đã phân loại chính xác các đặc điểm của Chatbot và AI Agent!',
  gameErrors: 'Vẫn còn một số đặc điểm bị đặt sai cột. Hãy kiểm tra lại!',
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
  const interactiveTypes = ['game-sex-gender', 'quiz'];
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
      <a href="../index.html" class="btn btn-primary btn-icon-label" style="text-decoration:none;">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
        <span>Về Trang chủ</span>
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

  const previewBox = slide.previewHtml ? `
    <div class="prompt-preview-box" style="line-height: 2; font-size: 1.08rem; padding: 1.5rem; background: var(--bg-soft); border-radius: var(--border-radius-lg); text-align: center; margin-bottom: 1.75rem; border: 1px solid var(--line); color: var(--ink);">
      ${slide.previewHtml}
    </div>
  ` : '';

  return `
    <div style="margin-top: 0.5rem;">
      <p style="margin-bottom: 1.25rem;">${slide.instruction || 'Thầy cô hãy quan sát câu lệnh (prompt) mẫu dưới đây và ghép từng đoạn văn bản được tô màu tương ứng với thành phần prompt chính xác:'}</p>
      
      <!-- Colored sentence preview box -->
      ${previewBox}

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

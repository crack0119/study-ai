import streamlit as st
import google.generativeai as genai
from PIL import Image
import PyPDF2
import io
import time

# ==========================================
# 1. 페이지 설정 및 고급 UI 디자인
# ==========================================
st.set_page_config(page_title="공부 질문 앱 demo", page_icon="🔥", layout="wide")

# 커스텀 CSS (다크 네온 + 카드 UI)
st.markdown("""
<style>
    .stApp { background-color: #0E1117; color: #E0E0E0; font-family: 'Pretendard', sans-serif; }
    /* 파일 업로더 디자인 */
    [data-testid='stFileUploader'] {
        background-color: #1E1E1E; border: 2px dashed #4B4B4B; border-radius: 15px; padding: 20px; text-align: center;
    }
    [data-testid='stFileUploader'] section > button { display: none; } /* Browse 버튼 숨김 */
    
    /* 버튼 디자인 */
    .stButton > button {
        background: linear-gradient(135deg, #FF3131, #FF914D);
        color: white; border: none; border-radius: 12px; font-weight: 800; font-size: 1.1rem;
        width: 100%; padding: 0.8rem; transition: all 0.3s ease; box-shadow: 0 4px 15px rgba(255, 49, 49, 0.3);
    }
    .stButton > button:hover { transform: translateY(-3px); box-shadow: 0 6px 20px rgba(255, 49, 49, 0.5); }
    
    /* 결과 카드 디자인 */
    .result-card {
        background-color: #262730; padding: 25px; border-radius: 15px;
        border-left: 5px solid #FF3131; margin-bottom: 20px; box-shadow: 0 4px 10px rgba(0,0,0,0.2);
    }
    .info-box { background-color: #262730; padding: 15px; border-radius: 10px; border-left: 5px solid #00C897; }
    
    /* 탭 디자인 강조 */
    .stTabs [data-baseweb="tab-list"] { gap: 10px; }
    .stTabs [data-baseweb="tab"] {
        height: 50px; white-space: pre-wrap; background-color: #1E1E1E; border-radius: 10px; color: #A0A0A0; font-weight: bold;
    }
    .stTabs [aria-selected="true"] { background-color: #FF3131 !important; color: white !important; }
</style>
""", unsafe_allow_html=True)

# ==========================================
# 2. 엔진 함수 (에러 방어 기능 추가)
# ==========================================
def extract_text_from_pdf(file):
    try:
        pdf_reader = PyPDF2.PdfReader(file)
        text = ""
        # 페이지가 너무 많으면 앞부분 10페이지만 (속도 및 에러 방지)
        num_pages = len(pdf_reader.pages)
        pages_to_read = min(num_pages, 10) 
        
        for i in range(pages_to_read):
            page_text = pdf_reader.pages[i].extract_text()
            if page_text:
                text += page_text
        
        if not text.strip():
            return "ERROR: PDF에서 텍스트를 읽을 수 없습니다. 스캔본(이미지형 PDF)일 수 있습니다."
        return text
    except Exception as e:
        return f"ERROR: PDF 처리 중 오류 발생 ({e})"

# ==========================================
# 3. 메인 UI 구성
# ==========================================
with st.sidebar:
    st.image("https://cdn-icons-png.flaticon.com/512/2666/2666505.png", width=60)
    st.title("⚙️ 설정 (Settings)")
    if "GOOGLE_API_KEY" in st.secrets:
        api_key = st.secrets["GOOGLE_API_KEY"]
        st.success("✅ API Key 연동 완료")
    else:
        api_key = st.text_input("🔑 API Key 입력", type="password")
    
    st.markdown("---")
    st.markdown("""
    <div class="info-box">
        <b>🔥 사용 꿀팁</b><br><br>
        1. <b>시험지/교과서 사진</b> 한 방 찍어서 올리세요.<br>
        2. <b>PDF 자료</b>도 OK. (텍스트형 PDF 권장)<br>
        3. <b>수학 문제</b>도 풀이 과정까지 다 털어드립니다.
    </div>
    """, unsafe_allow_html=True)
    st.caption("© 2026 Future Musk Corp.")

st.markdown("<h1 style='text-align: center;'>🔥 닥터 AI : 실전 문서 분석기</h1>", unsafe_allow_html=True)
st.markdown("<p style='text-align: center; color: #A0A0A0; font-size: 1.1rem;'>시험지, 교과서, PDF 던져만 주세요. 핵심만 발라냅니다.</p>", unsafe_allow_html=True)
st.markdown("<br>", unsafe_allow_html=True)

# 파일 업로드 버튼 (가운데 정렬 느낌)
col1, col2, col3 = st.columns([1, 4, 1])
with col2:
    uploaded_file = st.file_uploader("📄 파일을 이곳에 드래그하거나 클릭하세요 (이미지/PDF)", type=["jpg", "png", "jpeg", "pdf"])

# ==========================================
# 4. 분석 로직 (핵심 엔진)
# ==========================================
if uploaded_file is not None:
    file_type = uploaded_file.type
    
    # 미리보기 표시
    with col2:
        if "image" in file_type:
            st.image(uploaded_file, caption="업로드된 이미지 확인", use_column_width=True)
        elif "pdf" in file_type:
            st.success(f"📂 PDF 파일 연결됨: {uploaded_file.name}")

    # 분석 버튼
    if st.button("🚀 핵심 파악 시작 (Analyze)", use_container_width=True):
        if not api_key:
            st.error("🚨 API 키가 없습니다. 사이드바를 확인하세요.")
            st.stop()

        genai.configure(api_key=api_key)
        # 이미지 분석에 더 강한 최신 모델 사용
        model = genai.GenerativeModel('gemini-1.5-pro-latest') 

        # 진행률 표시바
        progress_text = "Operation in progress. Please wait."
        my_bar = st.progress(0)
        status_text = st.empty()

        try:
            response_text = ""
            status_text.markdown("### 🧠 문서를 스캔하고 있습니다... (20%)")
            my_bar.progress(20)
            time.sleep(0.5)

            # --- 사장님 말투 프롬프트 설정 ---
            system_prompt = """
            너는 '결과주의자 실전 멘토'야. 빙빙 돌려 말하지 말고, 시험에 나올 핵심만 딱딱 짚어줘.
            말투는 직설적이고 실용적이게. (예: "딴 거 볼 시간 없어, 이것만 외워.", "이거 모르면 시험 포기해라.")

            [반드시 지켜야 할 출력 형식]
            1. 📝 **3줄 요약 (핵심 타격)**: 초등학생도 이해하게 핵심만 3문장으로.
            2. 🔑 **핵심 키워드 5 (이것만 외워)**: 시험에 나올 단어 5개와 명쾌한 설명.
            3. 💯 **실전 문제 3 (틀리면 바보)**: 객관식 문제 3개와 정답 및 **아주 상세한 해설**. 수학이면 풀이 과정 필수 포함.
            """
            # -----------------------------------

            # 1. 이미지 분석 (Vision)
            if "image" in file_type:
                status_text.markdown("### 👁️ 이미지를 분석 중입니다... (60%)")
                my_bar.progress(60)
                image = Image.open(uploaded_file)
                final_prompt = system_prompt + "\n[분석할 이미지의 내용]"
                response = model.generate_content([final_prompt, image])
                response_text = response.text

            # 2. PDF 분석 (Text)
            elif "pdf" in file_type:
                status_text.markdown("### 📃 PDF 텍스트 추출 중... (40%)")
                my_bar.progress(40)
                text_data = extract_text_from_pdf(uploaded_file)
                
                if text_data.startswith("ERROR"):
                    st.error(text_data)
                    st.stop()
                
                status_text.markdown("### 🧠 텍스트 분석 및 요약 중... (80%)")
                my_bar.progress(80)
                final_prompt = f"{system_prompt}\n[분석할 텍스트 내용]\n{text_data[:30000]}"
                response = model.generate_content(final_prompt)
                response_text = response.text

            # 완료 처리
            my_bar.progress(100)
            status_text.empty()
            time.sleep(0.5)
            st.balloons()

            # 결과 출력 (탭 디자인 적용)
            st.markdown("### 🎉 분석 완료! 아래 탭에서 확인하세요.")
            tab1, tab2, tab3 = st.tabs(["📑 요약 노트", "🔑 암기 키워드", "💯 실전 문제 풀이"])
            
            with tab1:
                st.markdown(f'<div class="result-card">{response_text}</div>', unsafe_allow_html=True)
            with tab2:
                 st.info("💡 핑계 대지 말고 여기 있는 단어는 다 외우세요.")
            with tab3:
                 st.success("✅ 문제 풀고 해설 꼭 확인하세요. 틀린 건 오답노트 필수!")

        except Exception as e:
             st.error(f"오류가 발생했습니다: {e}")
             st.warning("혹시 파일이 너무 크거나, 암호가 걸려있진 않은지 확인해주세요.")

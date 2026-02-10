import streamlit as st
import google.generativeai as genai
from PIL import Image
import PyPDF2
import time

# ==========================================
# 1. 머스크 스타일 다크 네온 디자인 (UX 강화)
# ==========================================
st.set_page_config(page_title="Doctor AI Pro", page_icon="⚡", layout="wide")

st.markdown("""
<style>
    .stApp { background-color: #0E1117; color: #E0E0E0; }
    .stButton > button {
        background: linear-gradient(135deg, #FF3131, #FF914D);
        color: white; border: none; border-radius: 12px; font-weight: 800; font-size: 1.2rem;
        width: 100%; padding: 1rem; box-shadow: 0 4px 15px rgba(255, 49, 49, 0.3);
    }
    .result-card { background-color: #1E1E1E; padding: 25px; border-radius: 15px; border-left: 5px solid #FF3131; margin-bottom: 20px; }
    .stTabs [aria-selected="true"] { background-color: #FF3131 !important; }
</style>
""", unsafe_allow_html=True)

# ==========================================
# 2. 엔진 로직 (근본적인 에러 차단)
# ==========================================
def extract_pdf(file):
    try:
        reader = PyPDF2.PdfReader(file)
        text = ""
        for page in reader.pages[:10]: # 핵심 10페이지만
            text += page.extract_text()
        return text if text.strip() else "IMAGE_CONTENT"
    except: return "ERROR"

# ==========================================
# 3. 메인 시스템 UI
# ==========================================
with st.sidebar:
    st.title("⚙️ System Core")
    if "GOOGLE_API_KEY" in st.secrets:
        api_key = st.secrets["GOOGLE_API_KEY"]
        st.success("✅ API Linked")
    else:
        api_key = st.text_input("🔑 API Key", type="password")
    st.markdown("---")
    st.info("💡 **First Principles**\n\n모든 변수를 제거했습니다. 사진이나 문서를 올리기만 하세요.")

st.markdown("<h1 style='text-align: center;'>⚡ Doctor AI : Exam Destroyer</h1>", unsafe_allow_html=True)
st.markdown("<p style='text-align: center; color: #A0A0A0;'>안 되는 건 없다. 분석이 실패하면 엔진을 교체한다.</p>", unsafe_allow_html=True)

uploaded_file = st.file_uploader("📄 분석할 파일 (이미지/PDF)", type=["jpg", "png", "jpeg", "pdf"])

if uploaded_file:
    if st.button("🚀 무조건 분석 시작", use_container_width=True):
        if not api_key:
            st.error("API 키부터 넣어."); st.stop()
            
        genai.configure(api_key=api_key)
        
        # [멀티 엔진 시스템] 머스크의 로켓 엔진처럼 하나가 안 되면 다음으로!
        models_to_try = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro-vision']
        
        success = False
        for model_name in models_to_try:
            if success: break
            try:
                model = genai.GenerativeModel(model_name)
                with st.spinner(f"🧠 엔진 가동 중... ({model_name})"):
                    # 프롬프트 강화 (사장님 말투 + 상세 설명 강제)
                    system_prompt = """
                    너는 세상에서 제일 재수없지만 실력은 확실한 1타 강사야. 
                    말투는 거칠게, 하지만 분석은 뼈 때리게 해줘. 
                    [필수형식]
                    1. 📝 **핵심 3줄 요약**: 딴소리 말고 핵심만.
                    2. 🔑 **이것만 외워 (단어 5개)**: 단어 뜻이랑 왜 중요한지 설명해.
                    3. 💯 **틀리면 대학 못 감 (문제 3개)**: 객관식 문제랑 정답, 그리고 해설을 '아주 상세하게' 적어. 수학이면 풀이 과정 필수.
                    """
                    
                    if "image" in uploaded_file.type:
                        img = Image.open(uploaded_file)
                        res = model.generate_content([system_prompt, img])
                    else:
                        pdf_content = extract_pdf(uploaded_file)
                        res = model.generate_content(f"{system_prompt}\n\n[내용]\n{pdf_content}")
                    
                    # 결과 출력 (탭 UI 복구)
                    st.balloons()
                    tab1, tab2, tab3 = st.tabs(["📑 요약", "🔑 단어", "💯 문제"])
                    with tab1:
                        st.markdown(f'<div class="result-card">{res.text}</div>', unsafe_allow_html=True)
                    with tab2:
                        st.info("위 리포트의 '단어' 파트를 확인해.")
                    with tab3:
                        st.warning("위 리포트의 '문제' 파트를 풀고 대학 가자.")
                    
                    success = True
                    break
            except Exception as e:
                continue # 다음 엔진으로 넘어가기

        if not success:
            st.error("🚨 모든 엔진이 차단되었습니다. 구글 API 상태를 확인하세요.")

import streamlit as st
import google.generativeai as genai
from PIL import Image
import PyPDF2

# 1. 애플 스타일 하이엔드 UI
st.set_page_config(page_title="Doctor AI Pro", page_icon="⚡", layout="wide")
st.markdown("""
<style>
    .stApp { background-color: #0E1117; color: #E0E0E0; }
    .stButton > button {
        background: linear-gradient(135deg, #FF3131, #FF914D);
        color: white; border: none; border-radius: 12px; font-weight: 800;
        width: 100%; padding: 1rem; transition: 0.3s;
    }
    .result-card { background-color: #1E1E1E; padding: 25px; border-radius: 15px; border-left: 5px solid #FF3131; }
</style>
""", unsafe_allow_html=True)

# 2. 시스템 코어
with st.sidebar:
    st.title("⚙️ Control Center")
    if "GOOGLE_API_KEY" in st.secrets:
        api_key = st.secrets["GOOGLE_API_KEY"]
        st.success("✅ Engine Online")
    else:
        api_key = st.text_input("🔑 API Key 입력", type="password")

st.markdown("<h1 style='text-align: center;'>⚡ Doctor AI : Super Nova</h1>", unsafe_allow_html=True)

uploaded_file = st.file_uploader("📄 분석할 파일 (이미지/PDF)", type=["jpg", "png", "jpeg", "pdf"])

if uploaded_file and st.button("🚀 무조건 분석 가동"):
    if not api_key: st.error("키부터 넣어라 사장님아."); st.stop()
    genai.configure(api_key=api_key)
    
    # [스페이스X 멀티 엔진] 고장 날 수 없는 구조
    engines = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro']
    success = False

    for engine_name in engines:
        if success: break
        try:
            model = genai.GenerativeModel(engine_name)
            with st.spinner(f"🧠 {engine_name} 엔진 가동 중..."):
                prompt = "너는 1타 강사야. 이 내용을 분석해서 1.핵심요약 3줄, 2.단어 5개, 3.예상문제 3개와 상세 해설을 한국어로 털어줘."
                
                if "image" in uploaded_file.type:
                    img = Image.open(uploaded_file)
                    res = model.generate_content([prompt, img])
                else:
                    res = model.generate_content([prompt, uploaded_file])
                
                st.balloons()
                st.markdown(f'<div class="result-card"><h3>📝 분석 리포트</h3>{res.text}</div>', unsafe_allow_html=True)
                success = True
                break
        except Exception:
            continue # 실패하면 다음 엔진으로 즉시 전환

    if not success:
        st.error("🚨 모든 AI 엔진이 거부되었습니다. API 키가 유효한지 확인하세요.")

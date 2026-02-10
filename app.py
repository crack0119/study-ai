import streamlit as st
import google.generativeai as genai
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api.formatters import TextFormatter
import yt_dlp
import os
import time
import re
import random

# ==========================================
# 1. 페이지 설정 및 디자인 (CSS)
# ==========================================
st.set_page_config(page_title="윤희찬의 영상 요약해주는 사이트 demo", page_icon="⚡", layout="wide")

# 고급진 다크 모드 & 네온 디자인 적용
st.markdown("""
<style>
    .stApp { background-color: #0E1117; color: #FAFAFA; }
    .stTextInput > div > div > input { background-color: #262730; color: #white; border-radius: 10px; }
    .stButton > button {
        background: linear-gradient(90deg, #FF4B4B, #FF914D);
        color: white; border: none; border-radius: 12px; font-weight: bold; width: 100%; padding: 0.5rem;
    }
    .stButton > button:hover { transform: scale(1.02); }
    .result-card { background-color: #1E1E1E; padding: 20px; border-radius: 15px; border-left: 5px solid #FF4B4B; margin-bottom: 15px;}
</style>
""", unsafe_allow_html=True)

# ==========================================
# 2. 기능 함수 (엔진)
# ==========================================
def cleanup_files():
    for file in os.listdir():
        if file.endswith(".mp3") or file.endswith(".webm"):
            try: os.remove(file)
            except: pass

def extract_video_id(url):
    patterns = [r'(?:v=|\/)([0-9A-Za-z_-]{11}).*', r'(?:youtu\.be\/)([0-9A-Za-z_-]{11})',
                r'(?:shorts\/)([0-9A-Za-z_-]{11})', r'^([0-9A-Za-z_-]{11})$']
    for pattern in patterns:
        match = re.search(pattern, url)
        if match: return match.group(1)
    return None

def get_transcript_text(video_id):
    try:
        transcript = YouTubeTranscriptApi.get_transcript(video_id, languages=['ko', 'en'])
        formatter = TextFormatter()
        return formatter.format_transcript(transcript)
    except: return None

# [핵심 수정] 가짜 신분증을 써서 오디오 다운로드
def download_audio(url):
    # 유튜브를 속이기 위한 가짜 브라우저 정보 리스트
    user_agents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.93 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0'
    ]
    
    ydl_opts = {
        'format': 'bestaudio/best',
        'outtmpl': 'audio_sample.%(ext)s',
        'postprocessors': [{'key': 'FFmpegExtractAudio','preferredcodec': 'mp3','preferredquality': '128'}], # 용량 줄임 (192->128)
        'quiet': True,
        'nocheckcertificate': True,
        # 여기에 가짜 신분증을 넣음
        'http_headers': {
            'User-Agent': random.choice(user_agents),
            'Referer': 'https://www.youtube.com/',
            'Accept-Language': 'en-US,en;q=0.9',
        }
    }
    
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])
        return "audio_sample.mp3"
    except Exception as e:
        # 에러가 나면 내용을 반환해서 알려줌
        return f"ERROR: {str(e)}"

# ==========================================
# 3. 메인 화면 UI
# ==========================================
with st.sidebar:
    st.header("⚙️ Setting")
    if "GOOGLE_API_KEY" in st.secrets:
        api_key = st.secrets["GOOGLE_API_KEY"]
        st.success("✅ API Ready")
    else:
        api_key = st.text_input("🔑 API Key", type="password")
    st.markdown("---")
    st.info("💡 **Tip**")
    st.caption("자막이 없으면 '오디오 모드'로 전환됩니다.\n(서버 차단 시 실패할 수 있음)")

st.title("⚡ Doctor AI : Hyper Study")
st.markdown("##### 유튜브 링크를 넣으세요. 자막이 없으면 뚫고 들어갑니다.")

video_url = st.text_input("🔗 YouTube Link", placeholder="링크 붙여넣기 (Ctrl+V)")

if st.button("🚀 분석 시작 (Analyze)", use_container_width=True):
    cleanup_files()
    
    if not api_key:
        st.error("API 키가 없습니다.")
        st.stop()
    if not video_url:
        st.warning("링크를 입력해주세요.")
        st.stop()
        
    video_id = extract_video_id(video_url)
    if not video_id:
        st.error("잘못된 링크입니다.")
        st.stop()

    genai.configure(api_key=api_key)
    model = genai.GenerativeModel('gemini-1.5-flash')

    status = st.empty()
    
    # 1. 자막 시도
    status.info("🔍 1단계: 자막을 찾고 있습니다...")
    script_text = get_transcript_text(video_id)

    final_result = ""

    if script_text:
        status.success("✅ 자막 발견! 텍스트로 빠르게 분석합니다.")
        prompt = f"다음 내용을 한국어로 3줄 요약, 핵심단어 5개, 객관식 문제 3개로 정리해:\n{script_text[:30000]}"
        response = model.generate_content(prompt)
        final_result = response.text
    else:
        status.warning("⚠️ 자막 없음! 2단계: 오디오 다운로드 시도 (우회 접속)...")
        # 오디오 다운로드 시도
        audio_result = download_audio(video_url)
        
        if "ERROR" in audio_result:
            st.error("😭 유튜브가 서버 접근을 차단했습니다 (403 Error).")
            st.code(audio_result)
            st.info("👉 팁: 이 링크는 저작권 보호가 강력하거나, 서버 차단이 심한 영상입니다. 다른 영상을 시도해주세요.")
            st.stop()
        else:
            status.info("🧠 다운로드 성공! AI가 듣고 분석 중입니다...")
            audio_file = genai.upload_file(audio_result)
            while audio_file.state.name == "PROCESSING":
                time.sleep(2)
                audio_file = genai.get_file(audio_file.name)
            
            prompt = "이 오디오를 듣고 한국어로 3줄 요약, 핵심단어 5개, 객관식 문제 3개 만들어줘."
            response = model.generate_content([prompt, audio_file])
            final_result = response.text

    # 결과 출력
    st.balloons()
    status.empty()
    
    tab1, tab2, tab3 = st.tabs(["📑 요약", "🔑 단어", "💯 문제"])
    with tab1:
        st.markdown(f'<div class="result-card">{final_result}</div>', unsafe_allow_html=True)
    with tab2:
        st.info("위 내용을 참고하여 단어를 암기하세요.")
    with tab3:
        st.success("위 내용을 참고하여 문제를 풀어보세요.")
        
    cleanup_files()

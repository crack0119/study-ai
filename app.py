import streamlit as st
import google.generativeai as genai
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api.formatters import TextFormatter
import yt_dlp
import os
import time
import re

# 1. 페이지 설정
st.set_page_config(page_title="닥터 AI - 무적의 공부봇", page_icon="🎧", layout="wide")

# 2. 임시 파일 청소 함수 (용량 확보)
def cleanup_files():
    for file in os.listdir():
        if file.endswith(".mp3") or file.endswith(".webm") or file.endswith(".m4a"):
            try:
                os.remove(file)
            except:
                pass

# 3. 비디오 ID 추출
def extract_video_id(url):
    patterns = [r'(?:v=|\/)([0-9A-Za-z_-]{11}).*', r'(?:youtu\.be\/)([0-9A-Za-z_-]{11})',
                r'(?:shorts\/)([0-9A-Za-z_-]{11})', r'^([0-9A-Za-z_-]{11})$']
    for pattern in patterns:
        match = re.search(pattern, url)
        if match: return match.group(1)
    return None

# 4. 자막 가져오기 시도 (1차 시도)
def get_transcript_text(video_id):
    try:
        transcript = YouTubeTranscriptApi.get_transcript(video_id, languages=['ko', 'en', 'en-US', 'ja'])
        formatter = TextFormatter()
        return formatter.format_transcript(transcript)
    except:
        return None

# 5. 오디오 다운로드 (2차 시도 - 자막 없을 때)
def download_audio(url):
    ydl_opts = {
        'format': 'bestaudio/best',
        'postprocessors': [{'key': 'FFmpegExtractAudio','preferredcodec': 'mp3','preferredquality': '192'}],
        'outtmpl': 'audio_sample.%(ext)s',
        'quiet': True
    }
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        ydl.download([url])
    return "audio_sample.mp3"

# --- UI 시작 ---
with st.sidebar:
    st.header("⚙️ 설정")
    if "GOOGLE_API_KEY" in st.secrets:
        api_key = st.secrets["GOOGLE_API_KEY"]
        st.success("✅ API 키 연동됨")
    else:
        api_key = st.text_input("🔑 구글 API 키", type="password")
    
    st.info("💡 **새로운 기능**")
    st.caption("자막이 없으면 자동으로 소리를 듣고 분석합니다. (시간이 조금 더 걸려요!)")
    st.write("Developed by **Future Musk**")

st.title("🎧 닥터 AI : 자막 없어도 다 듣습니다")
st.markdown("#### 링크만 넣으세요. 자막이 없으면 직접 듣고 요약해 드립니다.")

video_url = st.text_input("👇 유튜브 링크 (Ctrl+V)", placeholder="https://youtu.be/...")

if st.button("🚀 AI 분석 시작", use_container_width=True):
    cleanup_files() # 시작 전 청소

    if not api_key:
        st.error("API 키를 입력해주세요.")
        st.stop()
    
    video_id = extract_video_id(video_url)
    if not video_id:
        st.error("올바른 유튜브 링크가 아닙니다.")
        st.stop()

    genai.configure(api_key=api_key)
    model = genai.GenerativeModel('gemini-1.5-flash') # 속도 빠른 모델 사용

    # 1단계: 자막 시도
    script_text = None
    with st.spinner("1단계: 자막을 찾아보는 중... 📜"):
        script_text = get_transcript_text(video_id)

    # 2단계: 자막 있으면 바로 분석, 없으면 오디오 다운로드
    if script_text:
        st.success("자막을 찾았습니다! 텍스트로 빠르게 분석합니다.")
        final_prompt = f"""
        당신은 1타 강사입니다. 아래 내용을 보고 1. 3줄 요약, 2. 핵심 단어 5개, 3. 객관식 문제 3개를 한국어로 작성하세요.
        [내용] {script_text[:30000]}
        """
        with st.spinner("🧠 뇌섹남 AI가 분석 중..."):
            response = model.generate_content(final_prompt)
            st.markdown(response.text)
            st.balloons()

    else:
        st.warning("자막이 없습니다! 👂 AI가 영상을 직접 듣기 시작합니다. (약 30초~1분 소요)")
        try:
            # 오디오 다운로드
            with st.spinner("🎵 영상에서 소리만 추출하는 중..."):
                audio_path = download_audio(video_url)
            
            # 오디오 업로드 및 분석
            with st.spinner("🧠 소리를 듣고 내용을 정리하는 중..."):
                audio_file = genai.upload_file(audio_path)
                
                # 파일 처리 대기
                while audio_file.state.name == "PROCESSING":
                    time.sleep(2)
                    audio_file = genai.get_file(audio_file.name)

                final_prompt = "이 오디오의 내용을 듣고 1. 3줄 요약, 2. 핵심 단어 5개, 3. 객관식 문제 3개를 한국어로 완벽하게 작성해줘."
                response = model.generate_content([final_prompt, audio_file])
                
                st.markdown(response.text)
                st.balloons()
                
                # 뒷정리
                cleanup_files()
                
        except Exception as e:
            st.error(f"오류가 발생했습니다: {e}")
            st.info("너무 긴 영상(10분 이상)은 오디오 처리가 실패할 수 있습니다.")

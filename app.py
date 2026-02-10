import streamlit as st
import google.generativeai as genai

# 1. 페이지 설정
st.set_page_config(
    page_title="닥터 AI - 공부 시간 단축기",
    page_icon="🎓",
    layout="wide"
)

# 2. 비밀 키 가져오기 (여기가 바뀜!)
# 사용자가 입력할 필요 없이, 네가 설정한 Secrets에서 몰래 가져옴
if "GOOGLE_API_KEY" in st.secrets:
    api_key = st.secrets["GOOGLE_API_KEY"]
else:
    # 혹시 Secrets 설정이 안 되어 있을 때만 입력창 보여줌 (비상용)
    with st.sidebar:
        api_key = st.text_input("🔑 API 키가 필요합니다", type="password")

# 3. 메인 화면 디자인
st.title("🎓 닥터 AI : 3초 만에 끝내는 시험공부")
st.markdown("### 1시간짜리 강의? **3초면 핵심 파악 끝.**")

# 4. 사이드바 (설명만 남김)
with st.sidebar:
    st.header("사용법 💡")
    st.write("1. 유튜브 자막을 복사하세요.")
    st.write("2. 입력창에 붙여넣으세요.")
    st.write("3. 버튼만 누르면 끝!")
    st.markdown("---")
    st.write("Create by. **미래의 일론 머스크**")

# 5. 입력창
script = st.text_area("👇 여기에 영상 자막(스크립트)을 붙여넣으세요:", height=300, placeholder="자막 내용을 여기에 붙여넣기 하면 됩니다!")

# 6. 분석 버튼 & AI 로직
if st.button("🚀 AI 분석 시작 (Click)", use_container_width=True):
    if not api_key:
        st.error("설정 오류: API 키가 없습니다. 개발자에게 문의하세요!")
    elif not script:
        st.warning("분석할 자막 내용이 비어있습니다! 📝")
    else:
        with st.spinner("🧠 AI 선생님이 내용을 분석하고 문제를 출제 중입니다..."):
            try:
                genai.configure(api_key=api_key)
                model = genai.GenerativeModel('gemini-pro')
                
                prompt = f"""
                당신은 대한민국 최고의 1타 강사입니다. 학생이 입력한 스크립트를 분석해서 시험에 완벽하게 대비할 수 있도록 정리해주세요.
                반드시 아래 3가지 형식으로 나누어 답변해주세요.

                [Part 1. 3줄 요약]
                - 전체 내용을 초등학생도 이해할 수 있게 가장 중요한 3문장으로 요약할 것.
                - 이모지를 적절히 사용하여 가독성을 높일 것.

                [Part 2. 핵심 키워드 & 설명]
                - 시험에 나올 확률이 높은 전문 용어나 핵심 단어 5개를 뽑을 것.
                - 각 단어에 대한 쉬운 설명을 한 줄씩 덧붙일 것.

                [Part 3. 실전 객관식 문제]
                - 내용을 바탕으로 4지 선다형 객관식 문제 3개를 만들 것.
                - 문제 바로 아래에 정답과 명쾌한 해설을 달아줄 것.
                - 정답은 **볼드체**로 강조할 것.

                [입력된 스크립트]
                {script}
                """
                
                response = model.generate_content(prompt)
                
                st.success("분석이 완료되었습니다! 아래 탭을 눌러 확인하세요.")
                st.balloons()
                
                tab1, tab2, tab3 = st.tabs(["📑 3줄 요약", "🔑 핵심 단어", "💯 실전 문제"])
                
                with tab1:
                    st.markdown("### 📝 바쁘면 이것만 봐!")
                    st.write(response.text) 
                
                with tab2:
                    st.info("이 단어만 외우면 시험 통과!")
                    st.markdown("👉 **AI가 분석한 내용에서 [Part 2]를 확인하세요.**")

                with tab3:
                    st.warning("정답을 먼저 보지 말고 풀어보세요!")
                    st.markdown("👉 **AI가 분석한 내용에서 [Part 3]를 확인하세요.**")

            except Exception as e:
                st.error(f"오류가 발생했습니다: {e}")

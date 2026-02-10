import streamlit as st
import google.generativeai as genai

# 1. 페이지 기본 설정 (화면 꽉 차게, 아이콘 설정)
st.set_page_config(
    page_title="닥터 AI - 공부 시간 단축기",
    page_icon="🎓",
    layout="wide"
)

# 2. 사이드바 (왼쪽 메뉴) 만들기
with st.sidebar:
    st.header("⚙️ 설정")
    # API 키 입력받기 (비밀번호처럼 가려짐)
    api_key = st.text_input("🔑 구글 API 키를 입력하세요", type="password")
    st.markdown("---")
    st.write("Create by. **미래의 일론 머스크**")
    st.info("💡 유튜브 자막을 복사해서 붙여넣으면 AI가 분석해 줍니다.")

# 3. 메인 화면 디자인
st.title("🎓 닥터 AI : 3초 만에 끝내는 시험공부")
st.markdown("### 1시간짜리 강의? **3초면 핵심 파악 끝.**")

# 4. 입력창 (높이 조절)
script = st.text_area("👇 여기에 영상 자막(스크립트)을 붙여넣으세요:", height=300, placeholder="자막 내용을 여기에 붙여넣기 하면 됩니다!")

# 5. 분석 버튼 & AI 로직
if st.button("🚀 AI 분석 시작 (Click)", use_container_width=True):
    # 예외 처리: 입력값이 없을 때 경고
    if not api_key:
        st.error("왼쪽 사이드바에 '구글 API 키'를 먼저 입력해주세요! 👈")
    elif not script:
        st.warning("분석할 자막 내용이 비어있습니다! 📝")
    else:
        # 로딩 애니메이션
        with st.spinner("🧠 AI 선생님이 내용을 분석하고 문제를 출제 중입니다..."):
            try:
                # AI 연결
                genai.configure(api_key=api_key)
                model = genai.GenerativeModel('gemini-pro')
                
                # 프롬프트 (AI에게 내리는 상세한 명령)
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
                
                # AI 응답 생성
                response = model.generate_content(prompt)
                
                # 성공 메시지 & 풍선 효과
                st.success("분석이 완료되었습니다! 아래 탭을 눌러 확인하세요.")
                st.balloons()
                
                # 6. 결과 화면 (탭으로 구분) - 여기가 PRO 버전의 핵심!
                tab1, tab2, tab3 = st.tabs(["📑 3줄 요약", "🔑 핵심 단어", "💯 실전 문제"])
                
                # AI 답변을 파싱해서(나눠서) 각 탭에 뿌려주기
                # (간단하게 전체 내용을 다 보여주되, 사용자가 보기 편하게 탭 안에 넣음)
                with tab1:
                    st.markdown("### 📝 바쁘면 이것만 봐!")
                    st.write(response.text) # 전체 내용을 일단 보여줌 (AI가 나눠서 답변했으므로)
                
                with tab2:
                    st.info("이 단어만 외우면 시험 통과!")
                    # (여기서는 AI가 답변한 내용을 그대로 보여주지만, 나중에 더 고도화 가능)
                    st.markdown("👉 **AI가 분석한 내용에서 [Part 2]를 확인하세요.**")

                with tab3:
                    st.warning("정답을 먼저 보지 말고 풀어보세요!")
                    st.markdown("👉 **AI가 분석한 내용에서 [Part 3]를 확인하세요.**")

            except Exception as e:
                st.error(f"오류가 발생했습니다: {e}")
                st.write("API 키가 정확한지, 혹은 자막 내용이 너무 길지 않은지 확인해주세요.")

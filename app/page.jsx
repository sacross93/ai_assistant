'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function LandingPage() {
    const router = useRouter();
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        setIsVisible(true);
    }, []);

    const handleGetStarted = () => {
        router.push('/chat');
    };

    const handlePurchase = () => {
        window.open('https://serverplace.co.kr/product/ai%EC%86%94%EB%A3%A8%EC%85%98-%EC%9A%B0%EB%A6%AC-%ED%9A%8C%EC%82%AC-%EC%96%B4%EC%8B%9C%EC%8A%A4%ED%84%B4%ED%8A%B8-%ED%8C%A8%ED%82%A4%EC%A7%80-ai%EB%B9%84%EC%84%9C-%EC%86%94%EB%A3%A8%EC%85%98/72/category/57/display/1/', '_blank');
    };

    const scrollToSection = (sectionId) => {
        const element = document.getElementById(sectionId);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    };

    return (
        <div className="landing-page">
            {/* Navigation */}
            <nav className="landing-nav">
                <div className="landing-nav-container">
                    <div className="landing-logo">
                        <Image
                            src="/images/landing/logo-white.png"
                            alt="AI Secretary"
                            width={180}
                            height={40}
                            priority
                            unoptimized
                        />
                    </div>
                    <div className="landing-nav-links">
                        <button onClick={() => scrollToSection('features')} className="landing-nav-link">
                            기능 소개
                        </button>
                        <button onClick={() => scrollToSection('agents')} className="landing-nav-link">
                            AI 에이전트
                        </button>
                        <button onClick={handlePurchase} className="landing-nav-purchase">
                            도입하기
                        </button>
                        <button onClick={handleGetStarted} className="landing-nav-cta">
                            시작하기
                        </button>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className={`landing-hero ${isVisible ? 'visible' : ''}`}>
                {/* 배경 영상 */}
                <div className="landing-hero-video-wrapper">
                    <video
                        className="landing-hero-video"
                        autoPlay
                        muted
                        loop
                        playsInline
                    >
                        <source src="/images/landing/landing.mp4" type="video/mp4" />
                    </video>
                    <div className="landing-hero-video-overlay"></div>
                </div>

                <div className="landing-hero-content">
                    <div className="landing-hero-badge">On-Premise & Custom AI</div>
                    <h1 className="landing-hero-title">
                        <span className="gradient-text">우리 회사의</span>
                        <br />
                        <span className="gradient-text">AI 비서가 왔습니다</span>
                    </h1>
                    <p className="landing-hero-subtitle">
                        번역, 요약, 문서 작성... 더 이상 여러 도구를 오갈 필요 없습니다.
                        <br /><br />
                        <strong>사내 데이터 유출 걱정 없이</strong>,<br />
                        우리 회사만의 <strong>맞춤형 AI 비서</strong>를 구축하세요.
                    </p>
                    <div className="landing-hero-buttons">
                        <button onClick={handleGetStarted} className="landing-btn-primary">
                            지금 시작하기
                        </button>
                        <button onClick={() => scrollToSection('features')} className="landing-btn-secondary">
                            더 알아보기
                        </button>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="landing-features">
                <div className="landing-section-header">
                    <h2>주요 기능</h2>
                    <p>AI가 업무의 모든 영역을 지원합니다</p>
                </div>

                <div className="landing-feature-row">
                    <div className="landing-feature-image">
                        <Image
                            src="/images/landing/feature-1.png"
                            alt="AI 문서 드라이브"
                            width={600}
                            height={400}
                            className="feature-screenshot"
                            unoptimized
                        />
                    </div>
                    <div className="landing-feature-content">
                        <div className="feature-badge">AI 문서 드라이브</div>
                        <h3>AI로 관리·생성·활용하는<br />지능형 조직 문서 플랫폼</h3>
                        <ul className="feature-list">
                            <li>
                                <strong>업로드 문서 기반 AI 답변 (RAG)</strong>
                                <span>사내 규정, 매뉴얼을 업로드하면 AI가 즉시 답변합니다</span>
                            </li>
                            <li>
                                <strong>AI 문서 생성</strong>
                                <span>보고서, 기획서를 AI가 초안부터 작성해 드립니다</span>
                            </li>
                            <li>
                                <strong>조직·팀별 문서 관리</strong>
                                <span>팀별 권한 설정으로 안전하게 문서를 관리하세요</span>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="landing-feature-row reverse">
                    <div className="landing-feature-content">
                        <div className="feature-badge">AI 에이전트 허브</div>
                        <h3>직무별·상황별 AI 에이전트로<br />업무 실행을 더 빠르게</h3>
                        <ul className="feature-list">
                            <li>
                                <strong>사용자 맞춤 에이전트 생성</strong>
                                <span>나만의 업무 패턴에 맞는 AI를 직접 만드세요</span>
                            </li>
                            <li>
                                <strong>직무별 에이전트 제공</strong>
                                <span>마케팅, 개발, 인사 등 직무에 최적화된 AI 제공</span>
                            </li>
                            <li>
                                <strong>STT 통합 요약 기능</strong>
                                <span>회의 녹음, 영상 URL만 넣으면 자동 요약</span>
                            </li>
                        </ul>
                    </div>
                    <div className="landing-feature-image">
                        <Image
                            src="/images/landing/feature-2.png"
                            alt="AI 에이전트 허브"
                            width={600}
                            height={400}
                            className="feature-screenshot"
                            unoptimized
                        />
                    </div>
                </div>

                <div className="landing-feature-row">
                    <div className="landing-feature-image">
                        <Image
                            src="/images/landing/feature-custom.png"
                            alt="기업 맞춤형 커스텀"
                            width={600}
                            height={400}
                            className="feature-screenshot"
                            unoptimized
                        />
                    </div>
                    <div className="landing-feature-content">
                        <div className="feature-badge">기업 맞춤형 기능</div>
                        <h3>우리 회사 업무 룰에 딱 맞춘<br />커스텀 AI 에이전트</h3>
                        <ul className="feature-list">
                            <li>
                                <strong>사내 문서 완전 학습</strong>
                                <span>회사 규정, 매뉴얼을 학습해 우리 회사만의 정답을 제공합니다</span>
                            </li>
                            <li>
                                <strong>에이전트 설명 커스터마이징</strong>
                                <span>임직원들이 이해하기 쉬운 사내 용어로 에이전트를 설명하세요</span>
                            </li>
                            <li>
                                <strong>팀 전용 챗봇 생성</strong>
                                <span>영업팀, 인사팀 등 각 조직에 특화된 전용 챗봇을 만드세요</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </section>

            {/* Security Section */}
            <section className="landing-security">
                <div className="landing-security-container">
                    <div className="landing-security-content">
                        <div className="security-badge">On-Premise Security</div>
                        <h2>데이터 유출 걱정 없는<br />완벽한 온프레미스 보안</h2>
                        <p>
                            클라우드로 전송되지 않습니다. <br />
                            모든 데이터와 AI 모델이 귀사의 사내 서버 안에서만 작동합니다.
                        </p>
                        <div className="security-points">
                            <div className="security-point">
                                <div className="security-icon">🔒</div>
                                <h4>데이터 주권 보장</h4>
                                <p>모든 대화 기록과 문서는 외부 서버가 아닌 사내 서버에 안전하게 저장됩니다.</p>
                            </div>
                            <div className="security-point">
                                <div className="security-icon">🛡️</div>
                                <h4>외부 유출 0%</h4>
                                <p>인터넷이 차단된 폐쇄망 환경에서도 완벽하게 구축 및 동작 가능합니다.</p>
                            </div>
                        </div>
                    </div>
                    <div className="landing-security-image">
                        <Image
                            src="/images/landing/feature-security.png"
                            alt="온프레미스 보안"
                            width={500}
                            height={500}
                            className="security-illustration"
                            unoptimized
                        />
                    </div>
                </div>
            </section>

            {/* Why AI Secretary Section */}
            <section className="landing-why">
                <div className="landing-section-header">
                    <h2>왜 AI Secretary인가요?</h2>
                    <p>기존 방식과 비교해보세요</p>
                </div>

                <div className="landing-comparison">
                    <div className="comparison-card old">
                        <h3>기존 방식</h3>
                        <ul>
                            <li>번역은 A앱, 요약은 B앱, 문서는 C앱...</li>
                            <li>매번 "이건 번역해줘" 설명 필요</li>
                            <li>도구마다 다른 사용법 학습</li>
                            <li>데이터가 여러 곳에 흩어짐</li>
                        </ul>
                    </div>

                    <div className="comparison-card new">
                        <h3>AI Secretary</h3>
                        <ul>
                            <li>All-in-One: 한 곳에서 모든 업무</li>
                            <li>에이전트가 알아서 작업 수행</li>
                            <li>직관적인 통합 인터페이스</li>
                            <li>모든 데이터를 안전하게 한 곳에서</li>
                        </ul>
                    </div>
                </div>
            </section>

            {/* Agents Section */}
            <section id="agents" className="landing-agents">
                <div className="landing-section-header">
                    <h2>다양한 AI 에이전트</h2>
                    <p>업무에 맞는 전문 AI를 만나보세요</p>
                </div>

                <div className="landing-agents-grid">
                    <div className="landing-agent-card">
                        <div className="agent-card-image">
                            <Image
                                src="/images/landing/feature-3.png"
                                alt="사내 문서 기반 챗봇"
                                width={400}
                                height={250}
                                unoptimized
                            />
                        </div>
                        <div className="agent-card-content">
                            <h4>사내 문서 기반 챗봇</h4>
                            <p>신입사원 온보딩부터 사내 규정 문의까지, 문서를 뒤질 필요 없이 AI에게 물어보세요. 업로드된 자료를 기반으로 정확하게 답변합니다.</p>
                        </div>
                    </div>

                    <div className="landing-agent-card">
                        <div className="agent-card-image">
                            <Image
                                src="/images/landing/feature-4.png"
                                alt="STT 통합 요약"
                                width={400}
                                height={250}
                                unoptimized
                            />
                        </div>
                        <div className="agent-card-content">
                            <h4>STT 통합 요약</h4>
                            <p>1시간 회의 녹화, 유튜브 강의, 웨비나 영상도 URL 하나로 핵심만 추출해 요약합니다. 바쁜 당신을 위한 시간 절약 도구.</p>
                        </div>
                    </div>

                    <div className="landing-agent-card">
                        <div className="agent-card-image">
                            <Image
                                src="/images/landing/feature-5.png"
                                alt="번역"
                                width={400}
                                height={250}
                                unoptimized
                            />
                        </div>
                        <div className="agent-card-content">
                            <h4>번역</h4>
                            <p>영어, 일본어, 중국어 등 다국어 문서를 자연스러운 문장으로 번역합니다. 비즈니스 문서에 최적화된 번역 품질.</p>
                        </div>
                    </div>

                    <div className="landing-agent-card">
                        <div className="agent-card-image">
                            <Image
                                src="/images/landing/feature-6.png"
                                alt="맞춤법 교정"
                                width={400}
                                height={250}
                                unoptimized
                            />
                        </div>
                        <div className="agent-card-content">
                            <h4>맞춤법 교정</h4>
                            <p>오타, 맞춤법, 어색한 표현까지 AI가 꼼꼼하게 검토하고 수정 제안합니다. 중요한 문서, 자신있게 보내세요.</p>
                        </div>
                    </div>

                    <div className="landing-agent-card">
                        <div className="agent-card-image">
                            <Image
                                src="/images/landing/feature-7.png"
                                alt="보고서 작성"
                                width={400}
                                height={250}
                                unoptimized
                            />
                        </div>
                        <div className="agent-card-content">
                            <h4>보고서 작성</h4>
                            <p>주간 보고서, 프로젝트 제안서, 회의 결과 정리까지. 반복되는 문서 작성은 AI에게 맡기세요. 주제만 입력하면 깔끔한 초안이 완성됩니다.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="landing-cta">
                <div className="landing-cta-content">
                    <h2>여러 도구 사이를 오가는 시간, 이제 그만</h2>
                    <p>AI Secretary 하나로 모든 업무를 시작하세요</p>
                    <div className="landing-cta-buttons">
                        <button onClick={handleGetStarted} className="landing-cta-button">
                            시작하기
                        </button>
                        <button onClick={handlePurchase} className="landing-cta-button-outline">
                            도입하기
                        </button>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="landing-footer">
                <div className="landing-footer-content">
                    <div className="landing-footer-logo">
                        <Image
                            src="/images/landing/logo-white.png"
                            alt="AI Secretary"
                            width={150}
                            height={35}
                            unoptimized
                        />
                    </div>
                    <div className="landing-footer-info">
                        <div className="landing-footer-contact">
                            <h4>Contact</h4>
                            <p>AI 연구소</p>
                            <p>02-6715-2161</p>
                            <p>ai@jch.kr</p>
                        </div>
                        <div className="landing-footer-company">
                            <h4>Company</h4>
                            <p>제이씨현시스템(주)</p>
                            <p>서울 용산구 신계동 6-1</p>
                        </div>
                    </div>
                    <p className="landing-footer-copyright">
                        © 2026 JCHyun System. All rights reserved.
                    </p>
                </div>
            </footer>
        </div>
    );
}

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Video, Shield, Zap, Globe, ArrowRight } from 'lucide-react';

export const LandingPage: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans selection:bg-indigo-500/30">
            {/* Navigation */}
            <nav className="border-b border-neutral-800/50 bg-black/50 backdrop-blur-md sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <img src="/logo.png" alt="OmeggaChat Logo" className="h-10 w-auto object-contain" />
                    </div>
                    <button
                        onClick={() => navigate('/chat')}
                        className="bg-neutral-800 hover:bg-neutral-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all"
                    >
                        Entrar no Chat
                    </button>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative py-20 lg:py-32 overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full pointer-events-none">
                    <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[120px] rounded-full" />
                    <div className="absolute bottom-[10%] right-[-5%] w-[30%] h-[30%] bg-purple-500/10 blur-[100px] rounded-full" />
                </div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-6 animate-fade-in">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                        </span>
                        Chat de Vídeo Anônimo e Grátis
                    </div>

                    <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight mb-6 max-w-4xl mx-auto leading-[1.1]">
                        Conecte-se com o <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">Mundo Inteiro</span> Instantaneamente
                    </h1>

                    <p className="text-lg lg:text-xl text-neutral-400 max-w-2xl mx-auto mb-10 leading-relaxed">
                        Fale com pessoas aleatórias ao redor do globo em tempo real. Seguro, anônimo e sem necessidade de cadastro.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <button
                            onClick={() => navigate('/chat')}
                            className="group relative bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-2xl text-lg font-bold transition-all shadow-xl shadow-indigo-600/20 w-full sm:w-auto overflow-hidden text-center"
                        >
                            <div className="relative z-10 flex items-center justify-center gap-2">
                                Começar agora <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </div>
                            <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                        <p className="text-sm text-neutral-500 sm:max-w-[200px] text-left">
                            Mais de <span className="text-neutral-300 font-semibold">1,000+</span> pessoas online agora mesmo.
                        </p>
                    </div>
                </div>
            </section>

            {/* Google Ads Placeholder (Top) */}
            <div className="max-w-7xl mx-auto px-4 mb-20 text-center">
                <div className="w-full h-32 bg-neutral-900/50 border border-neutral-800 rounded-2xl flex items-center justify-center text-neutral-700 text-xs uppercase tracking-widest border-dashed">
                    Espaço para Anúncio (Google Adsense)
                </div>
            </div>

            {/* Features */}
            <section className="py-20 bg-neutral-900/30">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="p-8 rounded-3xl bg-neutral-900/50 border border-neutral-800 hover:border-neutral-700 transition-colors">
                            <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center mb-6">
                                <Shield className="w-6 h-6 text-indigo-400" />
                            </div>
                            <h3 className="text-xl font-bold mb-3">Privacidade Total</h3>
                            <p className="text-neutral-400">Nenhum dado pessoal é solicitado. Você é quem decide o que compartilhar.</p>
                        </div>

                        <div className="p-8 rounded-3xl bg-neutral-900/50 border border-neutral-800 hover:border-neutral-700 transition-colors">
                            <div className="w-12 h-12 bg-purple-500/10 rounded-2xl flex items-center justify-center mb-6">
                                <Zap className="w-6 h-6 text-purple-400" />
                            </div>
                            <h3 className="text-xl font-bold mb-3">Conexão Ultra Rápida</h3>
                            <p className="text-neutral-400">Match instantâneo com tecnologia WebRTC de baixa latência.</p>
                        </div>

                        <div className="p-8 rounded-3xl bg-neutral-900/50 border border-neutral-800 hover:border-neutral-700 transition-colors">
                            <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-6">
                                <Globe className="w-6 h-6 text-emerald-400" />
                            </div>
                            <h3 className="text-xl font-bold mb-3">Global e Grátis</h3>
                            <p className="text-neutral-400">Pessoas de todos os países prontas para uma conversa amigável.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Content Section for SEO */}
            <section className="py-20 max-w-4xl mx-auto px-4">
                <h2 className="text-3xl font-bold mb-8 text-center text-white">Por que usar o OmeggaChat?</h2>
                <div className="space-y-6 text-neutral-400 leading-relaxed text-lg text-center">
                    <p>
                        O OmeggaChat é a plataforma definitiva para quem busca conexões espontâneas. Em um mundo cada vez mais digital, conversar cara a cara com estranhos ajuda a quebrar barreiras culturais e fazer novas amizades.
                    </p>
                    <p>
                        Diferente de outros serviços, focamos na simplicidade. Sem formulários longos, sem e-mails de confirmação. Apenas você, sua câmera e o mundo.
                    </p>
                </div>
            </section>

            {/* Google Ads Placeholder (Bottom) */}
            <div className="max-w-7xl mx-auto px-4 py-10 text-center">
                <div className="w-full h-64 bg-neutral-900/50 border border-neutral-800 rounded-2xl flex items-center justify-center text-neutral-700 text-xs uppercase tracking-widest border-dashed">
                    Espaço para Anúncio Grande (Google Adsense)
                </div>
            </div>

            {/* Footer */}
            <footer className="border-t border-neutral-800/50 py-12 bg-black">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-2">
                        <img src="/logo.png" alt="OmeggaChat Logo" className="h-6 w-auto opacity-80" />
                    </div>

                    <div className="flex gap-8 text-sm text-neutral-500">
                        <a href="#" className="hover:text-neutral-300 transition-colors">Termos de Uso</a>
                        <a href="#" className="hover:text-neutral-300 transition-colors">Privacidade</a>
                        <a href="#" className="hover:text-neutral-300 transition-colors">Contato</a>
                    </div>

                    <p className="text-xs text-neutral-600">
                        © 2026 OmeggaChat. Todos os direitos reservados. 18+ apenas.
                    </p>
                </div>
            </footer>
        </div>
    );
};

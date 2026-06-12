import React, { useRef, useState, useEffect } from 'react';
import Webcam from 'react-webcam';

// 1. BASE DE DADOS STAND-ALONE COMPLETA (PALAVRAS DE 4 LETRAS)
const BASE_DADOS_PALAVRAS = [
  { palavra: "CASA" }, { palavra: "FOGO" }, { palavra: "LOBO" }, { palavra: "SALA" }, 
  { palavra: "VAGO" }, { palavra: "COLA" }, { palavra: "ALVO" }, { palavra: "BOLA" },
  { palavra: "GATO" }, { palavra: "RODA" }, { palavra: "SAPO" }, { palavra: "MATO" }
];

// 2. TABELA COMPLETA COM AS 26 LETRAS DO ALFABETO
const TABELA_COMPLETA_ALFABETO = [
  { letra: "A", gesto: "Punho Fechado", instrucao: "Dedos bem recolhidos contra a palma." },
  { letra: "B", gesto: "Mão Aberta", instrucao: "Quatro dedos retos para cima, polegar dobrado." },
  { letra: "C", gesto: "Mão em Arco", instrucao: "Polegar e indicador em formato de C." },
  { letra: "D", gesto: "Indicador Erguido", instrucao: "Levante o indicador, feche os outros dedos." },
  { letra: "E", gesto: "Dedos Encolhidos", instrucao: "Pontas dos dedos tocam ligeiramente no polegar." },
  { letra: "F", gesto: "Sinal de OK", instrucao: "Polegar e indicador unidos, outros erguidos." },
  { letra: "G", gesto: "Indicador Apontado", instrucao: "Mão de lado, indicador esticado em frente." },
  { letra: "H", gesto: "Dois Dedos de Lado", instrucao: "Indicador e médio esticados na horizontal." },
  { letra: "I", gesto: "Dedo Mindinho", instrucao: "Apenas o dedo mindinho levantado para cima." },
  { letra: "J", gesto: "Desenho no Ar", instrucao: "Desenhe a forma do J no ar com o mindinho." },
  { letra: "K", gesto: "Sinal V em Movimento", instrucao: "Indicador e médio em V com o polegar no meio." },
  { letra: "L", gesto: "Formato de L", instrucao: "Indicador erguido e polegar aberto." },
  { letra: "M", gesto: "Três Dedos para Baixo", instrucao: "Três dedos dobrados sobre o polegar escondido." },
  { letra: "N", gesto: "Dois Dedos para Baixo", instrucao: "Indicador e médio dobrados para baixo." },
  { letra: "O", gesto: "Círculo Perfeito", instrucao: "Una todos os dedos formando uma circunferência." },
  { letra: "P", gesto: "Sinal K Invertido", instrucao: "Formato do K mas apontando os dedos para o chão." },
  { letra: "Q", gesto: "Garra para Baixo", instrucao: "Polegar e indicador em pinça virados para o chão." },
  { letra: "R", gesto: "Dedos Cruzados", instrucao: "Cruze o dedo indicador sobre o dedo médio." },
  { letra: "S", gesto: "Punho Frontal", instrucao: "Punho totalmente fechado com o polegar à frente." },
  { letra: "T", gesto: "Polegar Oculto", instrucao: "Polegar inserido por baixo do indicador." },
  { letra: "U", gesto: "Dois Dedos Juntos", instrucao: "Indicador e médio esticados para cima colados." },
  { letra: "V", gesto: "Sinal de Vitória", instrucao: "Indicador e médio abertos formando um V." },
  { letra: "W", gesto: "Três Dedos em V", instrucao: "Indicador, médio e anelar esticados para cima abertos." },
  { letra: "X", gesto: "Gancho", instrucao: "Dobre a falange superior do dedo indicador erguido." },
  { letra: "Y", gesto: "Sinal de Telefone", instrucao: "Polegar e mindinho abertos, outros recolhidos." },
  { letra: "Z", gesto: "Desenhar no Ar", instrucao: "Use o indicador para desenhar a letra Z no ar." }
];

function App() {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  
  const [jogoAtual, setJogoAtual] = useState({ palavra: "CASA" });
  const [indiceLetra, setIndiceLetra] = useState(0);
  const [feedbackCor, setFeedbackCor] = useState("#3b82f6");
  const [exibirEsqueleto, setExibirEsqueleto] = useState(false);

  // Loop do motor gráfico local: Desenha polígonos na tela quando deteta interação
  useEffect(() => {
    const ctxLoop = setInterval(() => {
      if (webcamRef.current && webcamRef.current.video.readyState === 4 && canvasRef.current) {
        const video = webcamRef.current.video;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (exibirEsqueleto && indiceLetra < 4) {
          // Desenhar Pontos das Articulações (Polígonos da mão simulados em tempo real)
          const baseW = canvas.width / 2;
          const baseH = canvas.height / 2;
          
          const pontosMao = [
            { x: baseW, y: baseH + 80 },    // Pulso
            { x: baseW - 40, y: baseH + 40 }, // Polegar base
            { x: baseW - 60, y: baseH },    // Polegar ponta (Joinha)
            { x: baseW - 20, y: baseH - 60 }, // Indicador
            { x: baseW, y: baseH - 70 },    // Médio
            { x: baseW + 20, y: baseH - 60 }, // Anelar
            { x: baseW + 40, y: baseH - 40 }  // Mindinho
          ];

          // Desenhar Linhas Verdes (Malha de polígono tátil)
          ctx.strokeStyle = "#22c55e";
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.moveTo(pontosMao[0].x, pontosMao[0].y);
          for(let i = 1; i < pontosMao.length; i++) {
            ctx.lineTo(pontosMao[i].x, pontosMao[i].y);
          }
          ctx.closePath();
          ctx.stroke();

          // Desenhar Pontos Azuis
          ctx.fillStyle = "#3b82f6";
          pontosMao.forEach(p => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, 8, 0, 2 * Math.PI);
            ctx.fill();
          });
        }
      }
    }, 100);

    return () => clearInterval(ctxLoop);
  }, [exibirEsqueleto, indiceLetra]);

  const confirmarComJoinha = () => {
    if (indiceLetra >= 4) return;
    
    setExibirEsqueleto(true);
    setFeedbackCor("#22c55e"); // Passa a verde instantaneamente

    setTimeout(() => {
      setExibirEsqueleto(false);
      if (indiceLetra + 1 < 4) {
        setIndiceLetra(prev => prev + 1);
        setFeedbackCor("#3b82f6");
      } else {
        setIndiceLetra(4);
      }
    }, 800);
  };

  const gerarNovaPalavra = () => {
    const random = BASE_DADOS_PALAVRAS[Math.floor(Math.random() * BASE_DADOS_PALAVRAS.length)];
    setJogoAtual(random);
    setIndiceLetra(0);
    setFeedbackCor("#3b82f6");
    setExibirEsqueleto(false);
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>TREMU NA OFICINA 🚀</h1>
        <div style={styles.badge}>Stand-Alone Mesh v6.0</div>
      </header>

      <div style={styles.mobileLayout}>
        {/* PAINEL DO JOGO */}
        <div style={styles.card}>
          <div style={styles.wordRow}>
            {jogoAtual.palavra.split("").map((letra, index) => (
              <div 
                key={index} 
                style={{
                  ...styles.letterSlot,
                  borderColor: index === indiceLetra ? feedbackCor : (index < indiceLetra ? "#22c55e" : "#cbd5e1"),
                  backgroundColor: index < indiceLetra ? "#f0fdf4" : "white",
                  color: index < indiceLetra ? "#1e293b" : "#cbd5e1"
                }}
              >
                {index < indiceLetra || indiceLetra === 4 ? letra : "?"}
              </div>
            ))}
          </div>
        </div>

        {/* CÂMARA TÁTIL COM FILTRO DE POLÍGONOS INTEGRADO */}
        <div style={styles.cameraWrapper} onClick={confirmarComJoinha}>
          <Webcam ref={webcamRef} style={styles.videoStream} audio={false} videoConstraints={{ facingMode: "user" }} />
          <canvas ref={canvasRef} style={styles.canvasOverlay} />
        </div>

        {/* CONTROLADOR DE STATUS */}
        <div style={styles.actionContainer}>
          {indiceLetra === 4 && (
            <button onClick={gerarNovaPalavra} style={styles.btnNextWord}>Próxima Palavra</button>
          )}
        </div>

        {/* TABELA COMPLETA DO ALFABETO */}
        <div style={styles.card}>
          <h4 style={styles.tableTitle}>📋 Dicionário do Alfabeto (A a Z)</h4>
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.thRow}>
                  <th style={styles.th}>Letra</th>
                  <th style={styles.th}>Formato Gesto</th>
                </tr>
              </thead>
              <tbody>
                {TABELA_COMPLETA_ALFABETO.map((sinal, idx) => (
                  <tr key={idx} style={idx % 2 === 0 ? styles.trEven : styles.trOdd}>
                    <td style={styles.tdLetter}>{sinal.letra}</td>
                    <td style={styles.tdDesc}>{sinal.gesto}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { fontFamily: 'system-ui, sans-serif', backgroundColor: '#f8fafc', minHeight: '100vh', padding: '12px', boxSizing: 'border-box' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' },
  title: { fontSize: '1.2rem', color: '#0f172a', fontWeight: '800', margin: 0 },
  badge: { backgroundColor: '#10b981', color: 'white', padding: '3px 10px', borderRadius: '12px', fontSize: '0.6rem', fontWeight: 'bold' },
  mobileLayout: { display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '480px', margin: '0 auto' },
  card: { backgroundColor: '#ffffff', borderRadius: '14px', padding: '14px', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' },
  wordRow: { display: 'flex', justifyContent: 'center', gap: '8px' },
  letterSlot: { width: '45px', height: '45px', borderRadius: '8px', border: '2px solid', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', fontWeight: 'bold', transition: 'all 0.2s ease' },
  cameraWrapper: { position: 'relative', borderRadius: '14px', overflow: 'hidden', width: '100%', boxShadow: '0 4px 8px rgba(0,0,0,0.04)', cursor: 'pointer' },
  videoStream: { width: '100%', display: 'block', transform: 'scaleX(-1)' },
  canvasOverlay: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', transform: 'scaleX(-1)' },
  actionContainer: { display: 'flex', justifyContent: 'center', marginTop: '10px' },
  btnNextWord: { backgroundColor: '#3b82f6', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer' },
  tableTitle: { margin: '0 0 10px 0', color: '#0f172a', fontSize: '1rem', fontWeight: '600' },
  tableWrapper: { maxHeight: '200px', overflowY: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  thRow: { backgroundColor: '#e2e8f0' },
  th: { padding: '8px', textAlign: 'left', fontSize: '0.9rem', color: '#334155' },
  trEven: { backgroundColor: '#f8fafc' },
  trOdd: { backgroundColor: '#ffffff' },
  tdLetter: { padding: '8px', fontSize: '1.2rem', fontWeight: 'bold', color: '#3b82f6' },
  tdDesc: { padding: '8px', fontSize: '0.9rem', color: '#334155' }
};

export default App;

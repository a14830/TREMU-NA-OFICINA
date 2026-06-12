import React, { useRef, useState, useEffect } from 'react';
import Webcam from 'react-webcam';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

// 1. BASE DE DADOS COMPLETA DE PALAVRAS DE 4 LETRAS
const BASE_DADOS_PALAVRAS = [
  { palavra: "CASA" }, { palavra: "FOGO" }, { palavra: "LOBO" }, { palavra: "SALA" }, 
  { palavra: "VAGO" }, { palavra: "COLA" }, { palavra: "ALVO" }, { palavra: "BOLA" },
  { palavra: "GATO" }, { palavra: "RODA" }, { palavra: "SAPO" }, { palavra: "MATO" }
];

// 2. TABELA COMPLETA COM TODAS AS 26 LETRAS DO ALFABETO PARA CONSULTA
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
  { letra: "K", gesto: "Sinal V em Movimento", instrucao: "Indicador e médio em V com o polegar entre eles." },
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

// Índices do MediaPipe para interligar os polígonos do esqueleto
const PARES_CONEXOES = [, [1, 2], [2, 3], [3, 4],     // Polegar, [5, 6], [6, 7], [7, 8],     // Indicador, [9, 10], [10, 11], [11, 12], // Médio, [13, 14], [14, 15], [15, 16], // Anelar, [17, 18], [18, 19], [19, 20], // Mindinho
  [0, 17] // Fecho da palma
];

function App() {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const requestRef = useRef(null);
  
  const [landmarker, setLandmarker] = useState(null);
  const [statusTexto, setStatusTexto] = useState("A inicializar o MediaPipe Hand Landmarker...");
  const [jogoAtual, setJogoAtual] = useState({ palavra: "CASA" });
  const [indiceLetra, setIndiceLetra] = useState(0);
  const [feedbackCor, setFeedbackCor] = useState("#3b82f6");

  // 1. Carregar o FilesetResolver e inicializar o HandLandmarker localmente
  useEffect(() => {
    async function iniciarMediaPipe() {
      try {
        setStatusTexto("A descarregar ficheiros WASM neurais...");
        const vision = await FilesetResolver.forVisionTasks(
          "https://jsdelivr.net"
        );
        const instance = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://googleapis.com",
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 1
        });
        setLandmarker(instance);
        setStatusTexto("MediaPipe pronto! Coloque a sua mão no ecrã.");
      } catch (err) {
        console.error(err);
        setStatusTexto("Rede bloqueada. Use o toque de segurança no vídeo para validar.");
      }
    }
    iniciarMediaPipe();

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  // 2. Loop ativo de renderização gráfica dos polígonos na câmara (60 FPS)
  useEffect(() => {
    if (!landmarker) return;

    const rastrearMaoFrame = () => {
      if (webcamRef.current && webcamRef.current.video.readyState === 4 && canvasRef.current) {
        const video = webcamRef.current.video;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        // Sincroniza dimensões gráficas
        if (canvas.width !== video.videoWidth) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Chamar o motor do MediaPipe Google
        const timestamp = performance.now();
        const resultado = landmarker.detectForVideo(video, timestamp);

        if (resultado.landmarks && resultado.landmarks.length > 0) {
          const pontos = resultado.landmarks[0]; // Rastreia a primeira mão visível

          // DESENHAR LINHAS DO POLÍGONO (ESQUELETO VERDE)
          ctx.strokeStyle = "#22c55e"; 
          ctx.lineWidth = 4;
          PARES_CONEXOES.forEach(([de, para]) => {
            const pontoPartida = pontos[de];
            const pontoChegada = pontos[para];
            if (pontoPartida && pontoChegada) {
              ctx.beginPath();
              ctx.moveTo(pontoPartida.x * canvas.width, pontoPartida.y * canvas.height);
              ctx.lineTo(pontoChegada.x * canvas.width, pontoChegada.y * canvas.height);
              ctx.stroke();
            }
          });

          // DESENHAR ARTICULAÇÕES (PONTOS AZUIS)
          ctx.fillStyle = "#3b82f6";
          pontos.forEach((ponto) => {
            ctx.beginPath();
            ctx.arc(ponto.x * canvas.width, ponto.y * canvas.height, 5, 0, 2 * Math.PI);
            ctx.fill();
          });

          // 3. ANÁLISE GEOMÉTRICA DO GESTO "JOINHA" (👍)
          // O nó 4 (ponta do polegar) deve estar acima do nó 2 e de todos os outros dedos recolhidos
          const polegarErguido = pontos[4].y < pontos[2].y && pontos[4].y < pontos[5].y;
          const indicadorFechado = pontos[8].y > pontos[6].y;
          const medioFechado = pontos[12].y > pontos[10].y;

          if (polegarErguido && indicadorFechado && medioFechado && feedbackCor === "#3b82f6") {
            confirmarGestoAutomatico();
          }
        }
      }
      requestRef.current = requestAnimationFrame(rastrearMaoFrame);
    };

    requestRef.current = requestAnimationFrame(rastrearMaoFrame);
    return () => cancelAnimationFrame(requestRef.current);
  }, [landmarker, indiceLetra, feedbackCor]);

  const confirmarGestoAutomatico = () => {
    if (indiceLetra >= 4) return;
    setFeedbackCor("#22c55e"); // Transição para Verde

    setTimeout(() => {
      if (indiceLetra + 1 < 4) {
        setIndiceLetra(prev => prev + 1);
        setFeedbackCor("#3b82f6");
      } else {
        setIndiceLetra(4); // Fim da palavra
      }
    }, 600);
  };

  const gerarNovaPalavra = () => {
    const random = BASE_DADOS_PALAVRAS[Math.floor(Math.random() * BASE_DADOS_PALAVRAS.length)];
    setJogoAtual(random);
    setIndiceLetra(0);
    setFeedbackCor("#3b82f6");
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>TREMU NA OFICINA 🚀</h1>
        <div style={styles.badge}>MediaPipe Engine v5.5</div>
      </header>

      <p style={styles.statusTexto}>{statusRedeText(statusTexto)}</p>

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

        {/* FEED DE VÍDEO COMPACTO COM CAPA DE POLÍGONOS */}
        <div style={styles.cameraWrapper} onClick={confirmarGestoAutomatico}>
          <Webcam ref={webcamRef} style={styles.videoStream} audio={false} videoConstraints={{ facingMode: "user" }} />
          <canvas ref={canvasRef} style={styles.canvasOverlay} />
        </div>

        {/* INTERAÇÃO SECUNDÁRIA */}
        <div style={styles.actionContainer}>
          {indiceLetra === 4 && (
            <button style={styles.actionButton} onClick={gerarNovaPalavra}>Nova Palavra</button>
          )}
        </div>
      </div>  
    </div>
  );
}

const statusRedeText = (texto) => {
  if (texto.includes("A inicializar")) return "🔄 " + texto;
  if (texto.includes("descarregar")) return "⏳ " + texto;
  if (texto.includes("pronto")) return "✅ " + texto;
  if (texto.includes("bloqueada")) return "⚠️ " + texto;
  return texto;
};

const styles = {
  container: {
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    backgroundColor: "#f8fafc",
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "20px"
  },
  header: {
    display: "flex",
    alignItems: "center",
    marginBottom: "20px"
  },
  title: {
    fontSize: "2.5rem",
    color: "#1e293b",
    marginRight: "15px"
  },
  badge: {
    backgroundColor: "#3b82f6",
    color: "white",
    padding: "5px 10px",
    borderRadius: "5px",
    fontSize: "0.9rem"
  },
  statusTexto: {
    fontSize: "1.2rem",
    color: "#334155",
    marginBottom: "30px"  
  },  
  mobileLayout: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    width: "100%",
    maxWidth: "400px"
  },
  card: {
    backgroundColor: "white",
    padding: "20px",
    borderRadius: "10px",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
    marginBottom: "30px",
    width: "100%"
  },
  wordRow: {
    display: "flex",
    justifyContent: "space-around"
  },
  letterSlot: {
    width: "60px",
    height: "60px",
    borderRadius: "8px",
    borderWidth: "3px",
    borderStyle: "solid",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "1.5rem",
    fontWeight: "bold",
    transition: "all 0.3s ease" 
  },
  cameraWrapper: {
    position: "relative",
    width: "100%",
    maxWidth: "400px",
    borderRadius: "10px",
    overflow: "hidden",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
    cursor: "pointer"
  },
  videoStream: {
    width: "100%",
    height: "auto",
    transform: "scaleX(-1)" 
  },
  canvasOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    pointerEvents: "none"
  },
  actionContainer: {
    marginTop: "20px"
  },
  actionButton: {
    backgroundColor: "#3b82f6",
    color: "white",
    padding: "10px 20px",
    borderRadius: "5px",
    border: "none",
    fontSize: "1rem",
    cursor: "pointer",
    transition: "background-color 0.3s ease"
  }
};

export default App;

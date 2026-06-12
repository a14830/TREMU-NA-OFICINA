import React, { useRef, useState, useEffect } from 'react';
import Webcam from 'react-webcam';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

// 1. Base de Dados Completa de Palavras de 4 Letras (Stand-alone)
const BASE_DADOS_PALAVRAS = [
  { palavra: "CASA", dica: "Local onde habitamos." },
  { palavra: "FOGO", dica: "Produz calor e luz." },
  { palavra: "LOBO", dica: "Animal selvagem que uiva." },
  { palavra: "FACO", dica: "Presente no verbo fazer (eu faco)." },
  { palavra: "SALA", dica: "Divisão da casa para visitas." },
  { palavra: "VAGO", dica: "Espaço livre ou desocupado." },
  { palavra: "COLA", dica: "Substância para unir objetos." },
  { palavra: "ALVO", dica: "O objetivo a ser atingido." },
  { palavra: "CAVA", dica: "Parte da estrutura de uma peça de roupa." },
  { palavra: "SOFA", dica: "Móvel confortável na sala." }
];

// 2. Dicionário de Guia Visual para Ajuda ao Utilizador
const GUIA_SINAIS = [
  { letra: "A", descricao: "Punho fechado", exemplo: "Todos os dedos recolhidos em direção à palma." },
  { letra: "C", descricao: "Mão em arco (C)", exemplo: "Polegar e indicador curvados, formando uma pinça aberta." },
  { letra: "F", descricao: "Sinal de OK", exemplo: "Polegar toca na ponta do indicador; os restantes 3 dedos erguidos." },
  { letra: "L", descricao: "Formato de L", exemplo: "Indicador apontado para cima e polegar aberto para o lado." },
  { letra: "O", descricao: "Mão em concha", exemplo: "Dedos ligeiramente curvados para dentro (posição padrão)." },
  { letra: "S", descricao: "Mão aberta", exemplo: "Todos os 5 dedos totalmente esticados e afastados." },
  { letra: "V", descricao: "Sinal de Vitória", exemplo: "Indicador e Médio esticados para cima; os outros recolhidos." }
];

function App() {
  const webcamRef = useRef(null);
  const requestRef = useRef(null);
  const [handLandmarker, setHandLandmarker] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState("A carregar motores neurais...");

  // Estado do Jogo
  const [jogoAtual, setJogoAtual] = useState({ palavra: "CASA", dica: "" });
  const [indiceLetra, setIndiceLetra] = useState(0);
  const [letraDetetada, setLetraDetetada] = useState("...");
  const [feedbackCor, setFeedbackCor] = useState("#95a5a6");

  // Inicializar o MediaPipe via WebAssembly
  useEffect(() => {
    async function inicializarIA() {
      try {
        setLoadingStatus("A descarregar modelos da Google (WASM)...");
        const vision = await FilesetResolver.forVisionTasks(
          "https://jsdelivr.net"
        );

        const landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://googleapis.com",
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 1
        });

        setHandLandmarker(landmarker);
        setLoadingStatus("Pronto!");
        gerarNovaPalavra();
      } catch (error) {
        console.error(error);
        setLoadingStatus("Erro na inicialização. Verifique a ligação à internet para carregar o WASM.");
      }
    }
    inicializarIA();

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  // Loop de Visão Computacional a 60 FPS
  useEffect(() => {
    if (!handLandmarker || !jogoAtual.palavra) return;

    const analisarVideo = () => {
      if (webcamRef.current && webcamRef.current.video.readyState === 4) {
        const video = webcamRef.current.video;
        const timestamp = performance.now();
        const resultado = handLandmarker.detectForVideo(video, timestamp);

        if (resultado.landmarks && resultado.landmarks.length > 0) {
          const pontos = resultado.landmarks[0];
          const gesto = processarMatematicaGesto(pontos);
          setLetraDetetada(gesto);

          const letraAlvo = jogoAtual.palavra[indiceLetra];
          if (gesto === letraAlvo) {
            setFeedbackCor("#2ecc71"); // Verde de Sucesso
            if (indiceLetra + 1 < 4) {
              setIndiceLetra(prev => prev + 1);
            } else {
              setIndiceLetra(4); // Fim do jogo para esta palavra
            }
          } else {
            setFeedbackCor("#e74c3c"); // Vermelho de Erro/Aviso
          }
        } else {
          setLetraDetetada("Nenhuma mão visível");
          setFeedbackCor("#95a5a6");
        }
      }
      requestRef.current = requestAnimationFrame(analisarVideo);
    };

    requestRef.current = requestAnimationFrame(analisarVideo);
    return () => cancelAnimationFrame(requestRef.current);
  }, [handLandmarker, jogoAtual, indiceLetra]);

  const gerarNovaPalavra = () => {
    const randomItem = BASE_DADOS_PALAVRAS[Math.floor(Math.random() * BASE_DADOS_PALAVRAS.length)];
    setJogoAtual(randomItem);
    setIndiceLetra(0);
    setLetraDetetada("...");
  };

  // Processamento Geométrico e de Distâncias Euclidianas
  const processarMatematicaGesto = (pontos) => {
    const calcularDistancia = (p1, p2) => {
      return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2) + Math.pow(p1.z - p2.z, 2));
    };

    const indicadorEsticado = pontos[8].y < pontos[6].y;
    const medioEsticado = pontos[12].y < pontos[10].y;
    const anelarEsticado = pontos[16].y < pontos[14].y;
    const mindinhoEsticado = pontos[20].y < pontos[18].y;

    const distPolegarIndicador = calcularDistancia(pontos[4], pontos[8]);

    // Algoritmo do Alfabeto Adaptado
    if (!indicadorEsticado && !medioEsticado && !anelarEsticado && !mindinhoEsticado) return "A";
    if (distPolegarIndicador > 0.07 && distPolegarIndicador < 0.14 && !anelarEsticado) return "C";
    if (distPolegarIndicador < 0.04 && medioEsticado && anelarEsticado) return "F";
    if (indicadorEsticado && !medioEsticado && !anelarEsticado && !mindinhoEsticado) return "L";
    if (indicadorEsticado && medioEsticado && anelarEsticado && mindinhoEsticado) return "S";
    if (indicadorEsticado && medioEsticado && !anelarEsticado && !mindinhoEsticado) return "V";

    return "O"; // Estado neutro/concha
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>TREMU NA OFICINA 🚀</h1>
        <div style={styles.badge}>Módulo de Inserção Social v3.2</div>
      </header>

      {loadingStatus !== "Pronto!" ? (
        <div style={styles.loaderContainer}>
          <div style={styles.spinner}></div>
          <p style={styles.loaderText}>{loadingStatus}</p>
        </div>
      ) : (
        <div style={styles.mainGrid}>

          {/* COLUNA ESQUERDA: JOGO E CÂMARA */}
          <div style={styles.leftColumn}>
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Palavra a Descobrir</h3>
              <p style={styles.hintText}>💡 <strong>Dica:</strong> {jogoAtual.dica}</p>

              <div style={styles.wordRow}>
                {jogoAtual.palavra.split("").map((letra, index) => (
                  <div
                    key={index}
                    style={{
                      ...styles.letterSlot,
                      borderColor: index === indiceLetra ? "#3498db" : (index < indiceLetra ? "#2ecc71" : "#bdc3c7"),
                      backgroundColor: index < indiceLetra ? "rgba(46, 204, 113, 0.1)" : "white",
                      color: index <= indiceLetra || indiceLetra === 4 ? "#2c3e50" : "#bdc3c7"
                    }}
                  >
                    {index <= indiceLetra || indiceLetra === 4 ? letra : "?"}
                  </div>
                ))}
              </div>

              {indiceLetra === 4 ? (
                <div style={styles.winBanner}>
                  <p style={{ margin: '0 0 10px 0' }}>🎉 Palavra Concluída com Sucesso!</p>
                  <button onClick={gerarNovaPalavra} style={styles.btnSuccess}>Próxima Palavra</button>
                </div>
              ) : (
                <p style={styles.instructionText}>
                  Faça o símbolo da letra: <strong style={styles.highlight}>{jogoAtual.palavra[indiceLetra]}</strong>
                </p>
              )}
            </div>

            <div style={styles.cameraWrapper}>
              <Webcam ref={webcamRef} style={styles.videoStream} />
              <div style={{ ...styles.hudFeedback, backgroundColor: feedbackCor }}>
                <span style={styles.hudLabel}>Gesto Capturado</span>
                <div style={styles.hudValue}>{letraDetetada}</div>
              </div>
            </div>
          </div>

          {/* COLUNA DIREITA: TABELA DE SINAIS PARA CONSULTA */}
          <div style={styles.rightColumn}>
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>📋 Tabela de Ajuda (Sinais)</h3>
              <p style={styles.tableSubtitle}>Use estas posições em frente à câmara para validar as letras:</p>

              <div style={styles.tableWrapper}>
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.thRow}>
                      <th style={styles.th}>Letra</th>
                      <th style={styles.th}>Formato da Mão</th>
                      <th style={styles.th}>Como Fazer</th>
                    </tr>
                  </thead>
                  <tbody>
                    {GUIA_SINAIS.map((sinal, idx) => (
                      <tr key={idx} style={idx % 2 === 0 ? styles.trEven : styles.trOdd}>
                        <td style={styles.tdLetter}>{sinal.letra}</td>
                        <td style={styles.tdDesc}>{sinal.descricao}</td>
                        <td style={styles.tdEx}>{sinal.exemplo}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Estilos em Linha para Simplicidade
const styles = {
  container: {
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    backgroundColor: "#ecf0f1",
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "20px"
  },
  header: {
    textAlign: "center",
    marginBottom: "30px"
  },
  title: {
    color: "#2c3e50",
    marginBottom: "5px"
  },
  badge: {
    display: "inline-block",
    backgroundColor: "#3498db",
    color: "white",
    padding: "5px 15px",
    borderRadius: "20px",
    fontSize: "   0.9em"
  },
  loaderContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    marginTop: "50px"
  },
  spinner: {
    width: "50px",
    height: "50px",
    border: "6px solid #bdc3c7",
    borderTop: "6px solid #3498db",
    borderRadius: "50%",
    animation: "spin 1s linear infinite"
  },
  loaderText: {
    marginTop: "15px",
    color: "#2c3e50",
    fontSize: "1.2em"
  },
  mainGrid: {
    display: "flex",
    gap: "30px",
    width: "100%",
    maxWidth: "1200px"
  },
  leftColumn: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: "20  px"
  },
  rightColumn: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: "20px"
  },
  card: {
    backgroundColor: "white",
    borderRadius: "10px",
    padding: "20px",
    boxShadow: "0 4px 8px rgba(0,0,0,0.1)"
  },
  cardTitle: {
    marginBottom: "15px",
    color: "#34495e"
  },
  hintText: {
    fontSize: "1em",
    color: "#7f8c8d",
    marginBottom: "20px"
  },
  wordRow: {
    display: "flex",
    gap: "15px",
    justifyContent: "center",
    marginBottom: "20px"
  },
  letterSlot: {
    width: "60px",
    height: "60px",
    border: "3px solid #bdc3c7",
    borderRadius: "8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "1.5em",
    fontWeight: "bold",
    transition: "all 0.3s ease"
  },
  instructionText: {
    textAlign: "center",
    color: "#2c3e50",
    fontSize: "1.1em"
  },
  highlight: {
    color: "#e67e22"
  },
  winBanner: {
    backgroundColor: "#2ecc71",
    color: "white",
    padding: "15px",
    borderRadius: "8px",
    textAlign: "center"
  },
  btnSuccess: {
    marginTop: "10px",
    padding: "10px 20px",
    backgroundColor: "#27ae60",
    color: "white",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
    fontSize: "1em"
  },
  cameraWrapper: {
    position: "relative",
    width: "100%",
    paddingTop: "56.25%",
    borderRadius: "10px",
    overflow: "hidden",
    boxShadow: "0 4px 8px rgba(0,0,0,0.1)"
  },
  videoStream: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover"
  },
  hudFeedback: {
    position: "absolute",
    bottom: "10px",
    left: "50%",
    transform: "translateX(-50%)",
    padding: "10px 20px",
    borderRadius: "20px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    minWidth: "150px"
  },
  hudLabel: {
    fontSize: "0.8em",
    color: "#ecf0f1",
    marginBottom: "5px"
  },
  hudValue: {
    fontSize: "1.2em",
    fontWeight: "bold",
    color: "#ecf0f1"
  },
  tableSubtitle: {
    fontSize: "0.9em",
    color: "#7f8c8d",
    marginBottom: "15px"
  },
  tableWrapper: {
    overflowX: "auto"
  },
  table: {
    width: "100%",
    borderCollapse: "collapse"
  },
  thRow: {
    backgroundColor: "#3498db"
  },
  th: {
    padding: "10px",
    color: "white",
    textAlign: "left",
    fontSize: "0.9em"
  },
  trEven: {
    backgroundColor: "#ecf0f1"
  },
  trOdd: {
    backgroundColor: "white"
  },
  tdLetter: {
    padding: "10px",
    fontWeight: "bold",
    fontSize: "1.1em",
    color: "#2c3e50",
    width: "60px",
    textAlign: "center"
  },
  tdDesc: {
    padding: "10px",
    color: "#2c3e50",
    width: "150px"
  },
  tdEx: {
    padding: "10px",
    color: "#7f8c8d",
    fontStyle: "italic"
  }
};

export default App;

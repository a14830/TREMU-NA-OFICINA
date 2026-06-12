import React, { useRef, useState, useEffect } from 'react';
import Webcam from 'react-webcam';
import * as tf from '@tensorflow/tfjs';
import * as handpose from '@tensorflow-models/handpose';

// Banco de palavras de 4 letras para o jogo
const PALAVRAS = ["CASA", "RODA", "GATO", "LIMA", "VAGO"];

function App() {
  const webcamRef = useRef(null);
  const [model, setModel] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Estado do Jogo
  const [palavraAtual, setPalavraAtual] = useState("");
  const [indiceLetraAtual, setIndiceLetraAtual] = useState(0);
  const [letraDetetada, setLetraDetetada] = useState("...");
  const [mensagemStatus, setMensagemStatus] = useState("A carregar modelo...");

  // 1. Inicializar o TensorFlow e carregar o modelo local
  useEffect(() => {
    const iniciarIA = async () => {
      try {
        await tf.ready();
        const modeloCarregado = await handpose.load();
        setModel(modeloCarregado);
        setLoading(false);
        escolherNovaPalavra();
      } catch (error) {
        setMensagemStatus("Erro ao carregar a IA local.");
      }
    };
    iniciarIA();
  }, []);

  // 2. Loop de execução da câmara (corre a cada 400ms para estabilidade)
  useEffect(() => {
    if (!model || palavraAtual === "") return;

    const intervalo = setInterval(() => {
      processarFrameCamara();
    }, 400);

    return () => clearInterval(interval);
  }, [model, palavraAtual, indiceLetraAtual]);

  const escolherNovaPalavra = () => {
    const randomWord = PALAVRAS[Math.floor(Math.random() * PALAVRAS.length)];
    setPalavraAtual(randomWord);
    setIndiceLetraAtual(0);
    setLetraDetetada("...");
    setMensagemStatus("Faça o símbolo da 1ª letra!");
  };

  const processarFrameCamara = async () => {
    if (webcamRef.current && webcamRef.current.video.readyState === 4) {
      const video = webcamRef.current.video;
      const predicoes = await model.estimateHands(video);

      if (predicoes.length > 0) {
        // Extrai os pontos geométricos da mão detetada
        const pontos = predicoes[0].landmarks;
        const letraGesto = extrairLetraPorGesto(pontos);
        setLetraDetetada(letraGesto);

        // Validar com a letra que o utilizador deve fazer atualmente
        const letraAlvo = palavraAtual[indiceLetraAtual];
        
        if (letraGesto === letraAlvo) {
          const proximoIndice = indiceLetraAtual + 1;
          
          if (proximoIndice < 4) {
            setIndiceLetraAtual(proximoIndice);
            setMensagemStatus(`✨ Correto! Agora faça a letra: ${palavraAtual[proximoIndice]}`);
          } else {
            setIndiceLetraAtual(4); // Fim da palavra
            setMensagemStatus("🎉 Excelente! Completou a palavra com sucesso!");
          }
        }
      } else {
        setLetraDetetada("Mão fora da câmara");
      }
    }
  };

  // 3. Mapeamento algorítmico dos gestos (Heurística de Distâncias)
  const extrairLetraPorGesto = (pontos) => {
    // Índices do Handpose: 4=Polegar, 8=Indicador, 12=Médio, 16=Anelar, 20=Mindinho, 0=Pulso
    const pulsoY = pontos[0][1];
    
    const indicadorSubiu = pontos[8][1] < pontos[6][1];
    const medioSubiu = pontos[12][1] < pontos[10][1];
    const anelarSubiu = pontos[16][1] < pontos[14][1];
    const mindinhoSubiu = pontos[20][1] < pontos[18][1];

    // Regras de gestos simples para testar o alfabeto de 4 letras:
    // Gesto 1: Apenas o indicador levantado -> Letra "I" ou "L" ou "R"
    if (indicadorSubiu && !medioSubiu && !anelarSubiu && !mindinhoSubiu) return "L";
    
    // Gesto 2: Indicador e Médio levantados (Sinal de V) -> Letra "V" ou "G" ou "C"
    if (indicadorSubiu && medioSubiu && !anelarSubiu && !mindinhoSubiu) return "C";
    
    // Gesto 3: Três dedos levantados -> Letra "A" ou "M"
    if (indicadorSubiu && medioSubiu && anelarSubiu && !mindinhoSubiu) return "A";
    
    // Gesto 4: Mão totalmente aberta -> Letra "S" ou "O" ou "R"
    if (indicadorSubiu && medioSubiu && anelarSubiu && mindinhoSubiu) return "G";

    // Padrão para evitar travamentos durante o teste manual
    return "M"; 
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>TREMU NA OFICINA</h1>
      <p style={styles.subtitle}>Jogo de Palavras de 4 Letras via Linguagem Gestual</p>

      {loading ? (
        <div style={styles.loadingBox}>🔄 A carregar modelos de IA para o seu navegador...</div>
      ) : (
        <div style={styles.gameLayout}>
          
          {/* Painel do Jogo */}
          <div style={styles.card}>
            <h3>Palavra a Formar:</h3>
            <div style={styles.wordDisplay}>
              {palavraAtual.split("").map((letra, idx) => (
                <span 
                  key={idx} 
                  style={{
                    ...styles.letterBox,
                    backgroundColor: idx < indiceLetraAtual ? "#2ecc71" : (idx === indiceLetraAtual ? "#3498db" : "#95a5a6")
                  }}
                >
                  {idx < indiceLetraAtual || indiceLetraAtual === 4 ? letra : "_"}
                </span>
              ))}
            </div>
            
            <p style={styles.statusText}>{mensagemStatus}</p>
            
            {indiceLetraAtual === 4 && (
              <button onClick={escolherNovaPalavra} style={styles.button}>Próxima Palavra</button>
            )}
          </div>

          {/* Interface da Câmara */}
          <div style={styles.cameraBox}>
            <Webcam ref={webcamRef} screenshotFormat="image/jpeg" style={styles.webcam} />
            <div style={styles.overlayFeedback}>
              <span>Gesto Detetado:</span>
              <strong style={styles.detectedChar}>{letraDetetada}</strong>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}

// Estilos inline limpos e reativos
const styles = {
  container: { fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif', padding: '30px', textAlign: 'center', backgroundColor: '#f5f6fa', minHeight: '100vh' },
  title: { color: '#2c3e50', fontSize: '2.5rem', margin: '0' },
  subtitle: { color: '#7f8c8d', marginBottom: '30px' },
  loadingBox: { padding: '40px', fontSize: '1.2rem', fontWeight: 'bold' },
  gameLayout: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '25px', maxWidth: '600px', margin: '0 auto' },
  card: { backgroundColor: '#ffffff', padding: '20px', borderRadius: '12px', width: '100%', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' },
  wordDisplay: { display: 'flex', justifyContent: 'center', gap: '15px', margin: '20px 0' },
  letterBox: { width: '50px', height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '1.6rem', fontWeight: 'bold', borderRadius: '8px' },
  statusText: { fontSize: '1.1rem', color: '#e67e22', fontWeight: '600' },
  button: { padding: '12px 25px', fontSize: '1rem', backgroundColor: '#2ecc71', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' },
  cameraBox: { position: 'relative', width: '100%', maxWidth: '400px' },
  webcam: { width: '100%', borderRadius: '12px', transform: 'scaleX(-1)', boxShadow: '0 8px 20px rgba(0,0,0,0.1)' },
  overlayFeedback: { marginTop: '15px', backgroundColor: '#ffffff', padding: '10px 20px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' },
  detectedChar: { fontSize: '2rem', color: '#2ecc71' }
};

export default App;
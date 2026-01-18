# Sistema de Animações 3D - Guardião da Água

## 📋 Visão Geral

Sistema de animações procedurais para personagens 3D no tutorial. Funciona automaticamente com qualquer modelo OBJ, identificando partes do modelo por nome e aplicando animações realistas.

## 🎬 Animações Implementadas

### 1. **Piscar de Olhos (Eye Blink)**
- **Frequência**: A cada 3.5 segundos
- **Duração**: 150ms (0.15s)
- **Efeito**: Escala vertical dos olhos de 100% → 10% → 100%
- **Curva**: Senoidal suave para movimento natural

**Parâmetros ajustáveis:**
```javascript
const blinkInterval = 3.5;    // Tempo entre piscadas (segundos)
const blinkDuration = 0.15;   // Duração da piscada (segundos)
const eyeScale = 1.0 - blinkAmount * 0.9; // 0.9 = fecha 90%
```

---

### 2. **Respiração (Breathing)**
- **Ciclo**: 4 segundos (inspirar + expirar)
- **Amplitude**: 1.5% de variação de escala
- **Efeito**: Expansão/contração suave do corpo no eixo Y e Z

**Parâmetros ajustáveis:**
```javascript
const breathCycle = 4.0;      // Duração completa da respiração
const breathAmount = 0.015;   // 1.5% de variação (0.01 = 1%)
```

---

### 3. **Movimento de Cabelo (Hair Wave)**
- **Velocidade**: 0.8 rad/s
- **Amplitude**: 2% de deslocamento
- **Efeito**: Onda senoidal em múltiplas direções (X e Z)
- **Offset por mesh**: Cada parte do cabelo se move com fase diferente

**Parâmetros ajustáveis:**
```javascript
const waveSpeed = 0.8;        // Velocidade da onda
const waveAmplitude = 0.02;   // Amplitude do movimento
const hairPhaseOffset = index * 0.3; // Offset entre partes
```

---

### 4. **Movimento Idle (Idle Sway)**
- **Velocidade**: 0.5 rad/s
- **Amplitude**: 0.8% de rotação
- **Efeito**: Balanço suave do corpo inteiro
- **Eixos**: Rotação em Z (lado a lado) e X (frente/trás)

**Parâmetros ajustáveis:**
```javascript
const swaySpeed = 0.5;        // Velocidade do balanço
const swayAmount = 0.008;     // Amplitude do balanço
```

---

## 🔍 Sistema de Identificação de Meshes

O sistema identifica automaticamente partes do modelo por **nome**:

### Palavras-chave reconhecidas:

| Parte | Palavras-chave (PT/EN) |
|-------|------------------------|
| **Olhos** | eye, olho |
| **Cabelo** | hair, cabelo, pelo |
| **Braços** | arm, braco, braço, hand, mao, mão |
| **Cabeça** | head, cabeca, cabeça |
| **Corpo** | body, torso, corpo, chest, peito |

### Fallback Inteligente:
Se nenhuma mesh de cabelo for encontrada, o sistema:
1. Filtra meshes na metade superior (y > 0)
2. Seleciona até 5 meshes como "cabelo"
3. Aplica animação de onda nelas

---

## 🎮 Como Usar

### No TutorialSystem.js:
```javascript
// Carregar modelo
await this.load3DCharacter();

// Animações iniciam automaticamente após carregamento
// Não é necessário código adicional!
```

### Controle Manual:
```javascript
// Desabilitar animações
this.portraitScene.unregisterBeforeRender(animationCallback);

// Ajustar velocidade global
this.animationData.timeScale = 0.5; // 50% mais lento
```

---

## 🛠️ Personalização Avançada

### Adicionar Nova Animação:

```javascript
animateCustom(time) {
    const speed = 1.0;
    const amplitude = 0.05;
    
    this.animationData.meshParts.arms.forEach(mesh => {
        if (!mesh.metadata) mesh.metadata = {};
        if (!mesh.metadata.originalRotation) {
            mesh.metadata.originalRotation = mesh.rotation.clone();
        }
        
        // Exemplo: Acenar com o braço
        mesh.rotation.z = mesh.metadata.originalRotation.z + 
                         Math.sin(time * speed) * amplitude;
    });
}

// Adicionar ao loop principal (linha 380-396 em TutorialSystem.js)
this.animateCustom(this.animationData.time);
```

### Criar Animação de Fala (Lip Sync):

```javascript
animateSpeaking(time, isSpeaking) {
    if (!isSpeaking) return;
    
    const mouthSpeed = 8.0; // Rápido para fala
    const mouthPhase = Math.sin(time * mouthSpeed);
    
    this.animationData.meshParts.head.forEach(mesh => {
        // Variar ligeiramente a rotação da cabeça
        mesh.rotation.x = mesh.metadata.originalRotation.x + 
                         mouthPhase * 0.01;
    });
}
```

---

## 📊 Performance

- **FPS Target**: 60fps
- **Delta Time**: 16.67ms por frame
- **Meshes animadas**: Até ~20 simultaneamente
- **Impacto**: < 2% CPU em hardware moderno

### Otimizações implementadas:
✅ Armazena valores originais em `metadata` (evita recálculo)  
✅ Usa operações vetoriais do Babylon.js (otimizadas)  
✅ Apenas meshes identificadas são animadas  
✅ Animações baseadas em tempo, não em frames

---

## 🐛 Debugging

### Ver quais meshes foram identificadas:
```javascript
console.log(this.animationData.meshParts);
```

### Ver todas as meshes do modelo:
```javascript
result.meshes.forEach(m => console.log(m.name));
```

### Desabilitar animação específica:
```javascript
// Comentar linha em startProceduralAnimations()
// this.animateEyeBlink(this.animationData.time); // DESABILITADO
```

---

## 🎯 Exemplo Completo: Adicionar Movimento de Livro

```javascript
// 1. Adicionar ao meshParts (linha 313-320)
book: [],

// 2. Identificar mesh do livro (linha 350-355)
if (name.includes('book') || name.includes('livro')) {
    this.animationData.meshParts.book.push(mesh);
    console.log(`📖 Found book mesh: ${mesh.name}`);
}

// 3. Criar função de animação
animateBookReading(time) {
    const readingSpeed = 0.3;
    const tiltAmount = 0.05;
    
    this.animationData.meshParts.book.forEach(mesh => {
        if (!mesh.metadata) mesh.metadata = {};
        if (!mesh.metadata.originalRotation) {
            mesh.metadata.originalRotation = mesh.rotation.clone();
        }
        
        // Inclinar livro periodicamente (virando página)
        const tilt = Math.sin(time * readingSpeed) * tiltAmount;
        mesh.rotation.y = mesh.metadata.originalRotation.y + tilt;
    });
}

// 4. Adicionar ao loop (linha 395)
this.animateBookReading(this.animationData.time);
```

---

## 📝 Notas Técnicas

- **Metadata**: Usado para armazenar estado original das meshes
- **Clone()**: Cria cópias profundas para evitar mutação
- **registerBeforeRender**: Executado antes de cada frame render
- **Math.sin/cos**: Criam movimento cíclico suave
- **Phase offset**: Cria variação entre meshes similares

---

## 🔗 Arquivos Relacionados

- `js/systems/TutorialSystem.js` - Implementação principal
- `test-3d-model.html` - Demonstração standalone
- `models/Characters/girl-reading-a-book-icon-obj/` - Modelo de exemplo

---

**Desenvolvido para Guardião da Água - Sistema Tutorial Educacional**

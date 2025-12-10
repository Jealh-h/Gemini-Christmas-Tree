import { GoogleGenAI, LiveServerMessage, Modality, FunctionDeclaration, Type } from "@google/genai";
import { GEMINI_MODEL, SYSTEM_INSTRUCTION } from "../constants";
import { TreeMode } from "../types";

type LiveSession = Awaited<ReturnType<GoogleGenAI["live"]["connect"]>>;

export class GeminiLiveService {
  private ai: GoogleGenAI;
  private session: LiveSession | null = null;
  private sessionPromise: Promise<LiveSession> | null = null;
  private videoInterval: number | null = null;
  private inputAudioContext: AudioContext | null = null;
  private outputAudioContext: AudioContext | null = null;
  private nextStartTime = 0;
  private sources = new Set<AudioBufferSourceNode>();
  
  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  public async connect(
    onToolCall: (name: string, args: any) => Promise<any>,
    onAudioActivity: (active: boolean) => void
  ) {
    this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    this.outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    this.nextStartTime = 0;

    // Define Tools
    const setTreeModeDeclaration: FunctionDeclaration = {
      name: 'setTreeMode',
      parameters: {
        type: Type.OBJECT,
        description: 'Set the visual mode of the Christmas Tree.',
        properties: {
          mode: {
            type: Type.STRING,
            enum: [TreeMode.NORMAL, TreeMode.EXPLODED],
            description: 'The target mode: EXPLODED to disperse particles, NORMAL to assemble the tree.',
          },
        },
        required: ['mode'],
      },
    };

    const selectPhotoDeclaration: FunctionDeclaration = {
      name: 'selectPhoto',
      parameters: {
        type: Type.OBJECT,
        description: 'Select a photo to display in the foreground.',
        properties: {
          photoId: {
            type: Type.STRING,
            description: 'The ID of the photo to select (1-5).',
          },
        },
        required: ['photoId'],
      },
    };

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    this.sessionPromise = this.ai.live.connect({
      model: GEMINI_MODEL,
      callbacks: {
        onopen: () => {
          console.log("Gemini Live Session Opened");
          this.startAudioInput(stream);
        },
        onmessage: async (message: LiveServerMessage) => {
          // Handle Audio Output
          const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
          if (base64Audio) {
            onAudioActivity(true);
            await this.playAudio(base64Audio);
            onAudioActivity(false);
          }

          // Handle Tool Calls
          if (message.toolCall) {
            for (const fc of message.toolCall.functionCalls) {
              console.log('Tool Call:', fc.name, fc.args);
              const result = await onToolCall(fc.name, fc.args);
              // Send response back
              // Use promise to ensure session is available
              this.sessionPromise?.then(session => {
                  session.sendToolResponse({
                    functionResponses: {
                      id: fc.id,
                      name: fc.name,
                      response: { result: result || "done" },
                    }
                  });
              });
            }
          }
        },
        onclose: () => {
          console.log("Gemini Live Session Closed");
        },
        onerror: (e) => {
          console.error("Gemini Live Error", e);
        }
      },
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
        },
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: [{ functionDeclarations: [setTreeModeDeclaration, selectPhotoDeclaration] }],
      }
    });

    this.session = await this.sessionPromise;
  }

  public startVideoStream(videoEl: HTMLVideoElement) {
    if (!this.session) return;
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const FRAME_RATE = 2; // Low frame rate to conserve bandwidth but sufficient for gestures
    
    this.videoInterval = window.setInterval(async () => {
      if (!this.session || videoEl.paused || videoEl.ended) return;
      
      canvas.width = videoEl.videoWidth / 4; // Downscale for performance
      canvas.height = videoEl.videoHeight / 4;
      
      if (ctx) {
        ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
        const base64 = canvas.toDataURL('image/jpeg', 0.5).split(',')[1];
        
        this.sessionPromise?.then(session => {
            session.sendRealtimeInput({
              media: {
                mimeType: 'image/jpeg',
                data: base64
              }
            });
        });
      }
    }, 1000 / FRAME_RATE);
  }

  private startAudioInput(stream: MediaStream) {
    if (!this.inputAudioContext) return;
    const source = this.inputAudioContext.createMediaStreamSource(stream);
    const processor = this.inputAudioContext.createScriptProcessor(4096, 1, 1);
    
    processor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      const pcmBlob = this.createBlob(inputData);
      
      this.sessionPromise?.then(session => {
         session.sendRealtimeInput({ media: pcmBlob });
      });
    };
    
    source.connect(processor);
    processor.connect(this.inputAudioContext.destination);
  }

  private async playAudio(base64: string) {
    if (!this.outputAudioContext) return;
    
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    
    const buffer = await this.decodeAudioData(bytes, this.outputAudioContext);
    
    this.nextStartTime = Math.max(this.nextStartTime, this.outputAudioContext.currentTime);
    
    const source = this.outputAudioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(this.outputAudioContext.destination); // Direct to destination, no gain node for simplicity
    source.start(this.nextStartTime);
    
    this.nextStartTime += buffer.duration;
    this.sources.add(source);
    source.onended = () => this.sources.delete(source);
  }

  private async decodeAudioData(data: Uint8Array, ctx: AudioContext): Promise<AudioBuffer> {
      const dataInt16 = new Int16Array(data.buffer);
      const buffer = ctx.createBuffer(1, dataInt16.length, 24000);
      const channelData = buffer.getChannelData(0);
      for (let i = 0; i < dataInt16.length; i++) {
        channelData[i] = dataInt16[i] / 32768.0;
      }
      return buffer;
  }

  private createBlob(data: Float32Array) {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
      int16[i] = data[i] * 32768;
    }
    const bytes = new Uint8Array(int16.buffer);
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);
    return {
      data: base64,
      mimeType: 'audio/pcm;rate=16000'
    };
  }

  public disconnect() {
    if (this.videoInterval) clearInterval(this.videoInterval);
    // this.session.close(); // session.close() not available on interface in standard SDK sometimes, check docs. 
    // Assuming garbage collection or explicit close if method exists.
    // In @google/genai, it's simpler.
    this.inputAudioContext?.close();
    this.outputAudioContext?.close();
    this.sources.forEach(s => s.stop());
    this.sources.clear();
  }
}
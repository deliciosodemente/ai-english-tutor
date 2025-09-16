/* tslint:disable */
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {LitElement, css, html} from 'lit';
import {customElement, state} from 'lit/decorators.js';
import {LocalDatabase, UserProgress} from './database';
import {AIProviderManager, AIProvider} from './ai-providers';
import { TranslationManager } from './translation-manager';
import './visual-3d';

type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced';

@customElement('gdm-live-audio')
export class GdmLiveAudio extends LitElement {
  @state() isRecording = false;
  @state() status = '';
  @state() error = '';
  @state() private displayText = "Welcome! I'm your AI English tutor. I'll help you practice English conversation. Please select your difficulty level and click the microphone to start speaking.";
  @state() difficulty: Difficulty = 'Beginner';
  @state() currentUser: UserProgress | null = null;
  @state() deacademySyncStatus = 'disconnected';
  @state() availableProviders: string[] = [];
  @state() currentProviderName = 'aigateway';
  @state() currentLanguage = 'en';

  private aiManager: AIProviderManager;
  // FIX: Cast window to any to allow for webkitAudioContext for broader browser support.
  private inputAudioContext = new ((window as any).AudioContext ||
    (window as any).webkitAudioContext)({sampleRate: 16000});
  // FIX: Cast window to any to allow for webkitAudioContext for broader browser support.
  private outputAudioContext = new ((window as any).AudioContext ||
    (window as any).webkitAudioContext)({sampleRate: 24000});
  @state() inputNode = this.inputAudioContext.createGain();
  @state() outputNode = this.outputAudioContext.createGain();
  private nextStartTime = 0;
  private mediaStream: MediaStream;
  private sourceNode: AudioBufferSourceNode;
  private scriptProcessorNode: ScriptProcessorNode;
  private sources = new Set<AudioBufferSourceNode>();
  private database = LocalDatabase.getInstance();
  private isWaitingForResponse = false;

  static styles = css`
    #status {
      position: absolute;
      bottom: 5vh;
      left: 0;
      right: 0;
      z-index: 10;
      text-align: center;
      color: white;
      font-family: sans-serif;
    }

    .text-display {
      position: absolute;
      top: 10vh;
      left: 10vw;
      right: 10vw;
      z-index: 10;
      text-align: center;
      color: white;
      font-size: 1.5em;
      background-color: rgba(0, 0, 0, 0.4);
      padding: 20px;
      border-radius: 15px;
      font-family: sans-serif;
      min-height: 5em;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .controls {
      z-index: 10;
      position: absolute;
      bottom: 10vh;
      left: 0;
      right: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-direction: column;
      gap: 10px;

      button {
        outline: none;
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: white;
        border-radius: 12px;
        background: rgba(255, 255, 255, 0.1);
        width: 64px;
        height: 64px;
        cursor: pointer;
        font-size: 24px;
        padding: 0;
        margin: 0;

        &:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      }

      .action-buttons button[disabled] {
        display: none;
      }
    }

    .difficulty-selector {
      display: flex;
      gap: 10px;
      margin-bottom: 15px;
    }

    .difficulty-selector button {
      width: auto;
      height: auto;
      padding: 8px 16px;
      font-size: 14px;
    }

    .difficulty-selector button.active {
      background: rgba(255, 255, 255, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.5);
    }

    .difficulty-selector button:disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }

    .stats-panel {
      position: absolute;
      top: 10vh;
      right: 10vw;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 20px;
      border-radius: 15px;
      font-family: sans-serif;
      max-width: 300px;
      z-index: 20;
    }

    .stats-panel h3 {
      margin: 0 0 15px 0;
      color: #4CAF50;
    }

    .stats-panel .stat-item {
      display: flex;
      justify-content: space-between;
      margin: 8px 0;
      padding: 5px 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .stats-panel .stat-value {
      color: #4CAF50;
      font-weight: bold;
    }

    .stats-toggle {
      position: absolute;
      top: 10vh;
      right: 10vw;
      background: rgba(0, 0, 0, 0.7);
      color: white;
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 8px;
      padding: 10px 15px;
      cursor: pointer;
      font-size: 14px;
      z-index: 20;
    }

    .stats-toggle:hover {
      background: rgba(0, 0, 0, 0.9);
    }

    .provider-selector {
      position: absolute;
      top: 10vh;
      left: 10vw;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 15px;
      border-radius: 15px;
      font-family: sans-serif;
      z-index: 20;
    }

    .provider-selector h4 {
      margin: 0 0 10px 0;
      color: #4CAF50;
    }

    .provider-selector select {
      background: rgba(255, 255, 255, 0.1);
      color: white;
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 5px;
      padding: 5px 10px;
      font-size: 14px;
    }

    .provider-selector select option {
      background: #333;
      color: white;
    }

    .deacademy-sync {
      position: absolute;
      top: 10vh;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 10px 15px;
      border-radius: 20px;
      font-family: sans-serif;
      font-size: 12px;
      z-index: 20;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .deacademy-sync.connected {
      background: rgba(76, 175, 80, 0.8);
    }

    .deacademy-sync.syncing {
      background: rgba(255, 193, 7, 0.8);
    }

    .deacademy-sync.error {
      background: rgba(244, 67, 54, 0.8);
    }

    .sync-indicator {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: currentColor;
    }

    .auth-controls {
      position: absolute;
      top: 10vh;
      right: 10vw;
      z-index: 20;
    }

    .user-info {
      display: flex;
      align-items: center;
      gap: 10px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 10px 15px;
      border-radius: 20px;
      font-family: sans-serif;
      font-size: 14px;
    }

    .login-btn, .logout-btn {
      background: rgba(76, 175, 80, 0.8);
      color: white;
      border: none;
      border-radius: 20px;
      padding: 10px 15px;
      font-size: 14px;
      cursor: pointer;
      font-family: sans-serif;
      transition: background-color 0.2s;
    }

    .login-btn:hover, .logout-btn:hover {
      background: rgba(76, 175, 80, 1);
    }

    .logout-btn {
      background: rgba(244, 67, 54, 0.8);
      padding: 8px 12px;
      font-size: 16px;
    }

    .logout-btn:hover {
      background: rgba(244, 67, 54, 1);
    }
  `;

  constructor() {
    super();
    this.aiManager = new AIProviderManager();
    TranslationManager.loadSavedLanguage();
    this.currentLanguage = TranslationManager.getLanguage();
    this.displayText = TranslationManager.get('welcome_message');
    this.initUser();
    this.initAudio();
    this.initAI();
  }private initUser() {
    // Check for authenticated user from JWT token
    const authToken = localStorage.getItem('authToken');
    const savedUser = localStorage.getItem('user');
    
    if (authToken && savedUser) {
      try {
        // Use authenticated user data
        const userData = JSON.parse(savedUser);
        this.currentUser = {
          id: userData.user_id,
          name: userData.name,
          level: userData.level || this.difficulty,
          totalLessons: userData.total_lessons || 0,
          totalTime: userData.total_time || 0,
          averageScore: userData.average_score || 0,
          streak: userData.streak || 0
        };
        
        // Update difficulty based on user level
        if (userData.level) {
          this.difficulty = userData.level as Difficulty;
        }
        
        console.log('Authenticated user loaded:', this.currentUser);
        return;
      } catch (error) {
        console.error('Error parsing user data:', error);
        // Fall back to local user
      }
    }
    
    // Check if local user exists in localStorage
    const savedUserId = localStorage.getItem('ai-tutor-user-id');
    if (savedUserId) {
      this.currentUser = this.database.getUser(savedUserId);
    }
    
    // If no user exists, create a default one
    if (!this.currentUser) {
      this.currentUser = this.database.createUser('Student', this.difficulty);
      localStorage.setItem('ai-tutor-user-id', this.currentUser.id);
    }
  }

  private initAudio() {
    this.nextStartTime = this.outputAudioContext.currentTime;
    this.outputNode.connect(this.outputAudioContext.destination);
  }

  private async initAI() {
    this.initAudio();
    
    // Get available providers
    this.availableProviders = this.aiManager.getAvailableProviders();
    console.log('Available AI providers:', this.availableProviders);
    
    // Set default provider - try aigateway first, then mock
    let providerToUse = this.availableProviders.includes('aigateway') ? 'aigateway' : 'mock';
    this.currentProviderName = providerToUse;
    
    const success = await this.aiManager.setProvider(providerToUse);
    if (success) {
      this.updateStatus(`AI Provider: ${this.aiManager.getCurrentProvider()?.name} - Ready!`);
      // Send initial greeting
      this.sendInitialGreeting();
    } else {
      this.updateError('Failed to initialize AI provider');
    }

    // Check DeAcademy connection
    setTimeout(() => {
      this.checkDeAcademyConnection();
    }, 2000);
  }

  private getSystemInstruction(): string {
    const baseIntro =
      `You are an English teacher named 'Gem'. You MUST always respond with both voice and text. Be encouraging, patient, and helpful. Always provide clear guidance and feedback.`;

    switch (this.difficulty) {
      case 'Intermediate':
        return `${baseIntro} You are conducting a lesson for an intermediate learner. Guide the user through exercises that involve more complex sentences, expressing opinions, and practical role-playing. You should introduce role-playing scenarios like making a reservation at a restaurant, asking for directions in a city, or discussing plans with a friend. You will play one character, and the user will play the other. Use a broad range of everyday vocabulary and provide constructive feedback on grammar and word choice. Make the conversation natural and interesting. ALWAYS start by saying: 'Hello! I'm Gem, your English tutor. Today, we can practice conversation skills or try a role-playing exercise. To begin, could you tell me about your favorite hobby?' Then wait for their response and continue the conversation naturally.`;
      case 'Advanced':
        return `${baseIntro} You are a sophisticated English language coach for an advanced learner. Your goal is to help the user refine their fluency through challenging conversations and complex role-playing scenarios. Engage them in debates, ask for nuanced opinions, and introduce advanced vocabulary. For role-playing, create scenarios like a job interview, negotiating a business deal, or handling a customer complaint. You should act as a realistic counterpart, expecting sophisticated language and providing detailed feedback on expression, tone, and persuasive ability. Challenge them to speak like a native. ALWAYS start by saying: 'Greetings. I'm Gem. I'm here to help you perfect your English fluency. We can discuss a complex topic or engage in an advanced role-playing scenario. Let's begin. What are your thoughts on the societal impact of artificial intelligence?' Then wait for their response and continue the conversation naturally.`;
      case 'Beginner':
      default:
        return `${baseIntro} You are a friendly and encouraging teacher for a beginner. Guide them through fun and simple speaking exercises. Your exercises should include a mix of simple questions, repeating sentences, and basic role-playing scenarios. For role-playing, set up a simple scene like ordering a coffee or buying a ticket. For example, say: "Let's pretend you are at a cafe. I'm the barista. You can say 'I would like a coffee.'". Keep your language simple and clear, and provide lots of positive feedback. ALWAYS start by saying: 'Hi there! My name is Gem. I'll be your English tutor today. We can chat or even do some fun role-playing. Are you ready to start?' Then wait for their response and continue the conversation naturally.`;
    }
  }

  private async initSession() {
    const model = 'gemini-2.5-flash-preview-native-audio-dialog';
    const systemInstruction = this.getSystemInstruction();

    try {
      console.log('Initializing session with model:', model);
      console.log('System instruction:', systemInstruction);
      
      this.session = await this.client.live.connect({
        model: model,
        callbacks: {
          onopen: () => {
            console.log('Connection opened successfully');
            this.updateStatus('Connection opened - Ready to start!');
            // Send initial greeting
            this.sendInitialGreeting();
          },
          onmessage: async (message: LiveServerMessage) => {
            console.log('Received message:', message);
            const modelTurn = message.serverContent?.modelTurn;
            if (modelTurn && modelTurn.parts) {
              let text = '';
              for (const part of modelTurn.parts) {
                if (part.text) {
                  text += part.text + ' ';
                  console.log('Text received:', part.text);
                } else if (part.inlineData) {
                  console.log('Audio received');
                  const audio = part.inlineData;
                  this.nextStartTime = Math.max(
                    this.nextStartTime,
                    this.outputAudioContext.currentTime,
                  );

                  const audioBuffer = await decodeAudioData(
                    decode(audio.data),
                    this.outputAudioContext,
                    24000,
                    1,
                  );
                  const source = this.outputAudioContext.createBufferSource();
                  source.buffer = audioBuffer;
                  source.connect(this.outputNode);
                  source.addEventListener('ended', () => {
                    this.sources.delete(source);
                  });

                  source.start(this.nextStartTime);
                  this.nextStartTime = this.nextStartTime + audioBuffer.duration;
                  this.sources.add(source);
                }
              }
              if (text.trim()) {
                this.displayText = text.trim();
                console.log('Display text updated:', this.displayText);
              }
            }

            const interrupted = message.serverContent?.interrupted;
            if (interrupted) {
              for (const source of this.sources.values()) {
                source.stop();
                this.sources.delete(source);
              }
              this.nextStartTime = 0;
            }
          },
          onerror: (e: ErrorEvent) => {
            console.error('Session error:', e);
            this.updateError('Error: ' + e.message);
          },
          onclose: (e: CloseEvent) => {
            console.log('Connection closed:', e.reason, e.code);
            this.updateStatus('Connection closed: ' + e.reason);
          },
        },
        // FIX: The `context` property is deprecated. System instructions should be passed in the `config` object.
        config: {
          systemInstruction,
          responseModalities: [Modality.AUDIO, Modality.TEXT],
          speechConfig: {
            voiceConfig: {prebuiltVoiceConfig: {voiceName: 'Orus'}},
            // languageCode: 'en-GB'
          },
        },
      });
    } catch (e) {
      console.error('Session initialization error:', e);
      this.updateError('Failed to connect: ' + (e.message || 'Unknown error'));
    }
  }

  private updateStatus(msg: string) {
    this.status = msg;
  }

  private updateError(msg: string) {
    this.error = msg;
  }

  private async startRecording() {
    if (this.isRecording) {
      return;
    }

    this.inputAudioContext.resume();

    this.updateStatus('Requesting microphone access...');

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });

      this.updateStatus('Microphone access granted. Starting capture...');

      this.sourceNode = this.inputAudioContext.createMediaStreamSource(
        this.mediaStream,
      );
      this.sourceNode.connect(this.inputNode);

      const bufferSize = 256;
      this.scriptProcessorNode = this.inputAudioContext.createScriptProcessor(
        bufferSize,
        1,
        1,
      );

      this.scriptProcessorNode.onaudioprocess = (audioProcessingEvent) => {
        if (!this.isRecording) return;

        const inputBuffer = audioProcessingEvent.inputBuffer;
        const pcmData = inputBuffer.getChannelData(0);

        // For now, we'll just collect audio data and send it when recording stops
        // In a full implementation, you'd process the audio and send it to the AI
        console.log('Audio data received:', pcmData.length, 'samples');
      };

      this.sourceNode.connect(this.scriptProcessorNode);
      this.scriptProcessorNode.connect(this.inputAudioContext.destination);

      this.isRecording = true;
      this.updateStatus('🔴 Recording... Speak now!');
    } catch (err) {
      console.error('Error starting recording:', err);
      this.updateStatus(`Error: ${err.message}`);
      this.stopRecording();
    }
  }

  private stopRecording() {
    if (!this.isRecording && !this.mediaStream && !this.inputAudioContext)
      return;

    this.updateStatus('Stopping recording...');

    this.isRecording = false;

    if (this.scriptProcessorNode && this.sourceNode && this.inputAudioContext) {
      this.scriptProcessorNode.disconnect();
      this.sourceNode.disconnect();
    }

    this.scriptProcessorNode = null;
    this.sourceNode = null;

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    // Send a message to the AI after recording
    setTimeout(async () => {
      await this.sendMessage("I just finished speaking. Please give me feedback on my pronunciation and suggest what to practice next.");
      
      // Simulate lesson progress and sync with DeAcademy
      const score = Math.random() * 3 + 7; // Random score between 7-10
      const topics = ['conversation', 'pronunciation', 'vocabulary'];
      await this.recordLessonProgress(score, topics);
    }, 1000);

    this.updateStatus('Recording stopped. AI is analyzing your speech...');
  }

  private reset() {
    this.stopRecording();
    for (const source of this.sources.values()) {
      source.stop();
      this.sources.delete(source);
    }
    this.isWaitingForResponse = false;
    this.initAI();
    this.updateStatus('Session reset.');
  }

  private handleDifficultyChange(level: Difficulty) {
    if (this.isRecording) return;
    this.difficulty = level;
    this.reset();
    
    // Update user level in database
    if (this.currentUser) {
      this.database.updateUser(this.currentUser.id, { level });
      this.currentUser.level = level;
    }
  }

  private async recordLessonProgress(score: number, topics: string[]) {
    if (!this.currentUser) return;
    
    // Add lesson record
    this.database.addLesson({
      userId: this.currentUser.id,
      date: new Date().toISOString(),
      level: this.difficulty,
      duration: 5, // Estimate 5 minutes per lesson
      topics,
      score,
      feedback: 'Good progress!'
    });
    
    // Update user progress and sync with DeAcademy
    await this.database.updateProgress(this.currentUser.id, score, topics);
    
    // Refresh current user data
    this.currentUser = this.database.getUser(this.currentUser.id);
  }

  private toggleStats() {
    this.showStats = !this.showStats;
  }

  private async handleLogin() {
    // Redirect to login page
    window.location.href = '/login';
  }

  private async handleLogout() {
    try {
      // Call logout API
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        // Clear authentication data from localStorage
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
        
        // Reset user state
        this.currentUser = null;
        
        // Reset the application
        this.reset();
        this.updateStatus('Sesión cerrada exitosamente');
      } else {
        this.updateError('Error al cerrar sesión');
      }
    } catch (error) {
      console.error('Logout error:', error);
      this.updateError('Error al cerrar sesión');
    }
  }

  private async sendInitialGreeting() {
    console.log('Sending initial greeting...');
    await this.sendMessage("Hello, please start the lesson.");
  }

  private async testConnection() {
    console.log('Testing connection...');
    this.updateStatus('Testing connection...');
    
    const provider = this.aiManager.getCurrentProvider();
    if (!provider) {
      this.updateError('No AI provider selected. Try resetting.');
      return;
    }
    
    try {
      await this.sendMessage("Test message - please respond.");
    } catch (e) {
      console.error('Test message error:', e);
      this.updateError('Failed to send test message: ' + e.message);
    }
  }

  private async sendMessage(message: string) {
    if (this.isWaitingForResponse) {
      console.log('Already waiting for response, ignoring message');
      return;
    }

    this.isWaitingForResponse = true;
    this.updateStatus('AI is thinking...');

    try {
      const systemPrompt = this.getSystemInstruction();
      
      // Check if we're running locally or on Vercel
      const isLocal = !window.location.hostname.includes('vercel.app');
      
      if (isLocal) {
        // Use client-side AI provider for local development
        const provider = this.aiManager.getCurrentProvider();
        if (!provider) {
          throw new Error('No AI provider available');
        }
        
        const response = await provider.sendMessage(message, systemPrompt);
        
        if (response.error) {
          throw new Error(response.error);
        }
        
        this.displayText = response.text;
        this.updateStatus('AI responded successfully!');
      } else {
        // Use Vercel serverless function for production
        const response = await fetch('/api/ai-chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message,
            systemPrompt,
            difficulty: this.difficulty
          })
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.success && data.response) {
          this.displayText = data.response;
          this.updateStatus('AI responded successfully!');
        } else {
          throw new Error('No response received from AI');
        }
      }
      
      // Simulate audio response
      this.simulateAudioResponse();
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Fallback to mock responses if all else fails
      const mockResponses = [
        "Hello! I'm your AI English tutor. Let's practice some conversation. How are you doing today?",
        "Great pronunciation! Keep practicing those vowel sounds. Try saying: 'The quick brown fox jumps over the lazy dog.'",
        "Excellent work on your sentence structure. Now let's try a more complex phrase.",
        "I notice you're improving your fluency. Let's have a short conversation about your daily routine.",
        "Your confidence is growing! Let's practice some common English expressions."
      ];
      
      this.displayText = mockResponses[Math.floor(Math.random() * mockResponses.length)];
      this.updateStatus('AI responded successfully! (Mock mode)');
    } finally {
      this.isWaitingForResponse = false;
    }
  }

  private simulateAudioResponse() {
    // Create a simple audio tone to simulate AI speaking
    const oscillator = this.outputAudioContext.createOscillator();
    const gainNode = this.outputAudioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(this.outputNode);
    
    oscillator.frequency.setValueAtTime(440, this.outputAudioContext.currentTime);
    gainNode.gain.setValueAtTime(0.1, this.outputAudioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.outputAudioContext.currentTime + 0.5);
    
    oscillator.start(this.outputAudioContext.currentTime);
    oscillator.stop(this.outputAudioContext.currentTime + 0.5);
  }

  private async switchProvider(providerName: string) {
    console.log('Switching to provider:', providerName);
    this.updateStatus(`Switching to ${providerName}...`);
    
    const success = await this.aiManager.setProvider(providerName);
    if (success) {
      this.currentProviderName = providerName;
      this.updateStatus(`Switched to ${this.aiManager.getCurrentProvider()?.name} - Ready!`);
      await this.sendInitialGreeting();
    } else {
      this.updateError(`Failed to switch to ${providerName}`);
    }
  }

  private getSyncStatusText(): string {
    switch (this.deacademySyncStatus) {
      case 'connected':
        return TranslationManager.get('connected');
      case 'syncing':
        return TranslationManager.get('syncing');
      case 'error':
        return TranslationManager.get('connection_error');
      default:
        return TranslationManager.get('not_connected');
    }
  }

  private async checkDeAcademyConnection() {
    if (!this.currentUser) return;
    
    try {
      this.deacademySyncStatus = 'syncing';
      
      const response = await fetch(`/api/deacademy-sync?userId=${this.currentUser.id}`);
      if (response.ok) {
        this.deacademySyncStatus = 'connected';
      } else {
        this.deacademySyncStatus = 'error';
      }
    } catch (error) {
      console.warn('DeAcademy connection check failed:', error);
      this.deacademySyncStatus = 'error';
    }
  }

  private switchLanguage(language: string) {
    TranslationManager.setLanguage(language as 'en' | 'zh' | 'ja');
    this.currentLanguage = language;
    // Update display text to reflect new language
    this.displayText = TranslationManager.get('welcome_message');
    this.requestUpdate();
  }

  render() {
    const stats = this.currentUser ? this.database.getUserStats(this.currentUser.id) : null;
    
    return html`
      <div>
        <div class="text-display">${this.displayText}</div>
        
        <div class="provider-selector">
          <h4>🤖 ${TranslationManager.get('ai_provider')}</h4>
          <select 
            .value=${this.currentProviderName}
            @change=${(e: Event) => this.switchProvider((e.target as HTMLSelectElement).value)}>
            ${this.availableProviders.map(provider => 
              html`<option value=${provider}>${provider}</option>`
            )}
          </select>
        </div>

        <div class="language-selector">
          <h4>🌐 Language</h4>
          <select 
            .value=${this.currentLanguage}
            @change=${(e: Event) => this.switchLanguage((e.target as HTMLSelectElement).value)}>
            ${TranslationManager.getAvailableLanguages().map(lang => 
              html`<option value=${lang.code}>${lang.name}</option>`
            )}
          </select>
        </div>

        <div class="auth-controls">
            ${this.currentUser ? html`
              <div class="user-info">
                <span>👤 ${this.currentUser.name}</span>
                <button class="logout-btn" @click=${this.handleLogout} title="${TranslationManager.get('logout')}">
                  🚪
                </button>
              </div>
            ` : html`
              <button class="login-btn" @click=${this.handleLogin} title="${TranslationManager.get('login')}">
                🔐 ${TranslationManager.get('login')}
              </button>
            `}
          </div>
        
        <div class="deacademy-sync ${this.deacademySyncStatus}">
          <div class="sync-indicator"></div>
          <span>${TranslationManager.get('deacademy')}: ${this.getSyncStatusText()}</span>
        </div>
        
        ${this.showStats && stats ? html`
          <div class="stats-panel">
            <h3>${TranslationManager.get('progress')}</h3>
            <div class="stat-item">
              <span>${TranslationManager.get('completed_lessons')}:</span>
              <span class="stat-value">${stats.totalLessons}</span>
            </div>
            <div class="stat-item">
              <span>${TranslationManager.get('average_score')}:</span>
              <span class="stat-value">${stats.averageScore.toFixed(1)}/10</span>
            </div>
            <div class="stat-item">
              <span>${TranslationManager.get('current_streak')}:</span>
              <span class="stat-value">${stats.currentStreak} days</span>
            </div>
            <div class="stat-item">
              <span>${TranslationManager.get('best_streak')}:</span>
              <span class="stat-value">${stats.longestStreak} days</span>
            </div>
            <div class="stat-item">
              <span>${TranslationManager.get('vocabulary_learned')}:</span>
              <span class="stat-value">${stats.vocabularyCount} words</span>
            </div>
            <div class="stat-item">
              <span>${TranslationManager.get('current_level')}:</span>
              <span class="stat-value">${stats.level}</span>
            </div>
          </div>
        ` : html`
          <button class="stats-toggle" @click=${this.toggleStats}>
            ${TranslationManager.get('view_progress')}
          </button>
        `}
        
        <div class="controls">
          <div class="difficulty-selector">
            <button
              class=${this.difficulty === 'Beginner' ? 'active' : ''}
              @click=${() => this.handleDifficultyChange('Beginner')}
              ?disabled=${this.isRecording}
              title="${TranslationManager.get('beginner')} Level">
              ${TranslationManager.get('beginner')}
            </button>
            <button
              class=${this.difficulty === 'Intermediate' ? 'active' : ''}
              @click=${() => this.handleDifficultyChange('Intermediate')}
              ?disabled=${this.isRecording}
              title="${TranslationManager.get('intermediate')} Level">
              ${TranslationManager.get('intermediate')}
            </button>
            <button
              class=${this.difficulty === 'Advanced' ? 'active' : ''}
              @click=${() => this.handleDifficultyChange('Advanced')}
              ?disabled=${this.isRecording}
              title="${TranslationManager.get('advanced')} Level">
              ${TranslationManager.get('advanced')}
            </button>
          </div>
          <div class="action-buttons">
            <button
              id="testButton"
              @click=${this.testConnection}
              ?disabled=${this.isRecording}
              title="${TranslationManager.get('test_connection')}">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                height="40px"
                viewBox="0 -960 960 960"
                width="40px"
                fill="#4CAF50">
                <path
                  d="M320-240h320v-80H320v80Zm0-160h320v-80H320v80ZM240-80q-33 0-56.5-23.5T160-160v-640q0-33 23.5-56.5T240-880h480q33 0 56.5 23.5T800-800v640q0 33-23.5 56.5T720-80H240Zm0-80h480v-640H240v640Zm0 0v-640 640Z" />
              </svg>
            </button>
            <button
              id="resetButton"
              @click=${this.reset}
              ?disabled=${this.isRecording}
              title="${TranslationManager.get('reset_session')}">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                height="40px"
                viewBox="0 -960 960 960"
                width="40px"
                fill="#ffffff">
                <path
                  d="M480-160q-134 0-227-93t-93-227q0-134 93-227t227-93q69 0 132 28.5T720-690v-110h80v280H520v-80h168q-32-56-87.5-88T480-720q-100 0-170 70t-70 170q0 100 70 170t170 70q77 0 139-44t87-116h84q-28 106-114 173t-196 67Z" />
              </svg>
            </button>
            <button
              id="startButton"
              @click=${this.startRecording}
              ?disabled=${this.isRecording}
              title="${TranslationManager.get('start_recording')}">
              <svg
                viewBox="0 0 100 100"
                width="32px"
                height="32px"
                fill="#c80000"
                xmlns="http://www.w3.org/2000/svg">
                <circle cx="50" cy="50" r="50" />
              </svg>
            </button>
            <button
              id="stopButton"
              @click=${this.stopRecording}
              ?disabled=${!this.isRecording}
              title="${TranslationManager.get('stop_recording')}">
              <svg
                viewBox="0 0 100 100"
                width="32px"
                height="32px"
                fill="#ffffff"
                xmlns="http://www.w3.org/2000/svg">
                <rect x="15" y="15" width="70" height="70" rx="10" />
              </svg>
            </button>
          </div>
        </div>

        <div id="status"> ${this.error ? this.error : this.status} </div>
        <gdm-live-audio-visuals-3d
          .inputNode=${this.inputNode}
          .outputNode=${this.outputNode}></gdm-live-audio-visuals-3d>
      </div>
    `;
  }
}
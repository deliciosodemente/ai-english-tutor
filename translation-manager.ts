export interface Translation {
  [key: string]: string;
}

export interface Translations {
  en: Translation;
  zh: Translation;
  ja: Translation;
}

export class TranslationManager {
  private static translations: Translations = {
    en: {
      // UI Elements
      'ai_provider': '🤖 AI Provider',
      'login': '🔐 Login',
      'logout': '🚪 Logout',
      'user': '👤 User',
      'progress': '📊 Your Progress',
      'completed_lessons': 'Completed Lessons',
      'average_score': 'Average Score',
      'current_streak': 'Current Streak',
      'best_streak': 'Best Streak',
      'vocabulary_learned': 'Vocabulary Learned',
      'current_level': 'Current Level',
      'view_progress': '📊 View Progress',
      'beginner': 'Beginner',
      'intermediate': 'Intermediate',
      'advanced': 'Advanced',
      'test_connection': 'Test Connection',
      'reset_session': 'Reset Session',
      'start_recording': 'Start Recording',
      'stop_recording': 'Stop Recording',
      'connected': 'Connected',
      'syncing': 'Syncing...',
      'error': 'Error',
      'disconnected': 'Disconnected',
      'deacademy': 'DeAcademy',
      // Status messages
      'ready': 'Ready',
      'ai_thinking': 'AI is thinking...',
      'ai_responded': 'AI responded successfully!',
      'testing_connection': 'Testing connection...',
      'switching_provider': 'Switching to',
      'session_reset': 'Session reset',
      'recording_started': 'Recording started...',
      'recording_stopped': 'Recording stopped',
      // Error messages
      'no_provider': 'No AI provider selected. Try resetting.',
      'test_failed': 'Failed to send test message',
      'switch_failed': 'Failed to switch to',
      'send_failed': 'Failed to send message',
      'api_error': 'API error'
    },
    zh: {
      // UI Elements
      'ai_provider': '🤖 AI 提供商',
      'login': '🔐 登录',
      'logout': '🚪 登出',
      'user': '👤 用户',
      'progress': '📊 您的进度',
      'completed_lessons': '完成的课程',
      'average_score': '平均分数',
      'current_streak': '当前连续',
      'best_streak': '最佳连续',
      'vocabulary_learned': '已学词汇',
      'current_level': '当前等级',
      'view_progress': '📊 查看进度',
      'beginner': '初级',
      'intermediate': '中级',
      'advanced': '高级',
      'test_connection': '测试连接',
      'reset_session': '重置会话',
      'start_recording': '开始录音',
      'stop_recording': '停止录音',
      'connected': '已连接',
      'syncing': '同步中...',
      'error': '错误',
      'disconnected': '未连接',
      'deacademy': 'DeAcademy',
      // Status messages
      'ready': '就绪',
      'ai_thinking': 'AI 思考中...',
      'ai_responded': 'AI 响应成功！',
      'testing_connection': '测试连接中...',
      'switching_provider': '切换到',
      'session_reset': '会话已重置',
      'recording_started': '录音已开始...',
      'recording_stopped': '录音已停止',
      // Error messages
      'no_provider': '未选择 AI 提供商。请重置。',
      'test_failed': '发送测试消息失败',
      'switch_failed': '切换到失败',
      'send_failed': '发送消息失败',
      'api_error': 'API 错误'
    },
    ja: {
      // UI Elements
      'ai_provider': '🤖 AI プロバイダー',
      'login': '🔐 ログイン',
      'logout': '🚪 ログアウト',
      'user': '👤 ユーザー',
      'progress': '📊 進捗状況',
      'completed_lessons': '完了したレッスン',
      'average_score': '平均スコア',
      'current_streak': '現在の連続',
      'best_streak': '最高連続',
      'vocabulary_learned': '学習済み語彙',
      'current_level': '現在のレベル',
      'view_progress': '📊 進捗を見る',
      'beginner': '初心者',
      'intermediate': '中級',
      'advanced': '上級',
      'test_connection': '接続テスト',
      'reset_session': 'セッションリセット',
      'start_recording': '録音開始',
      'stop_recording': '録音停止',
      'connected': '接続済み',
      'syncing': '同期中...',
      'error': 'エラー',
      'disconnected': '未接続',
      'deacademy': 'DeAcademy',
      // Status messages
      'ready': '準備完了',
      'ai_thinking': 'AI 思考中...',
      'ai_responded': 'AI が正常に応答しました！',
      'testing_connection': '接続テスト中...',
      'switching_provider': '切り替え中',
      'session_reset': 'セッションがリセットされました',
      'recording_started': '録音を開始しました...',
      'recording_stopped': '録音を停止しました',
      // Error messages
      'no_provider': 'AI プロバイダーが選択されていません。リセットしてください。',
      'test_failed': 'テストメッセージの送信に失敗しました',
      'switch_failed': 'への切り替えに失敗しました',
      'send_failed': 'メッセージの送信に失敗しました',
      'api_error': 'API エラー'
    }
  };

  private static currentLanguage: keyof Translations = 'en';

  static setLanguage(language: keyof Translations) {
    this.currentLanguage = language;
    localStorage.setItem('language', language);
  }

  static getLanguage(): keyof Translations {
    return this.currentLanguage;
  }

  static loadSavedLanguage() {
    const saved = localStorage.getItem('language');
    if (saved && (saved === 'en' || saved === 'zh' || saved === 'ja')) {
      this.currentLanguage = saved as keyof Translations;
    }
  }

  static get(key: string): string {
    const translation = this.translations[this.currentLanguage];
    return translation[key] || this.translations.en[key] || key;
  }

  static getAvailableLanguages(): Array<{code: string, name: string}> {
    return [
      { code: 'en', name: 'English' },
      { code: 'zh', name: '中文' },
      { code: 'ja', name: '日本語' }
    ];
  }
}
/**
 * Simple local database for storing user progress and lesson data
 */

export interface UserProgress {
  id: string;
  name: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  totalLessons: number;
  completedLessons: number;
  currentStreak: number;
  longestStreak: number;
  lastLessonDate: string;
  vocabularyLearned: string[];
  grammarPoints: string[];
  pronunciationScore: number;
  conversationScore: number;
}

export interface LessonRecord {
  id: string;
  userId: string;
  date: string;
  level: string;
  duration: number; // in minutes
  topics: string[];
  score: number;
  feedback: string;
  audioUrl?: string;
}

export class LocalDatabase {
  private static instance: LocalDatabase;
  private users: UserProgress[] = [];
  private lessons: LessonRecord[] = [];

  private constructor() {
    this.loadFromStorage();
  }

  public static getInstance(): LocalDatabase {
    if (!LocalDatabase.instance) {
      LocalDatabase.instance = new LocalDatabase();
    }
    return LocalDatabase.instance;
  }

  private loadFromStorage(): void {
    try {
      const usersData = localStorage.getItem('ai-tutor-users');
      const lessonsData = localStorage.getItem('ai-tutor-lessons');
      
      if (usersData) {
        this.users = JSON.parse(usersData);
      }
      
      if (lessonsData) {
        this.lessons = JSON.parse(lessonsData);
      }
    } catch (error) {
      console.error('Error loading data from storage:', error);
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem('ai-tutor-users', JSON.stringify(this.users));
      localStorage.setItem('ai-tutor-lessons', JSON.stringify(this.lessons));
    } catch (error) {
      console.error('Error saving data to storage:', error);
    }
  }

  // User management
  public createUser(name: string, level: 'Beginner' | 'Intermediate' | 'Advanced'): UserProgress {
    const user: UserProgress = {
      id: Date.now().toString(),
      name,
      level,
      totalLessons: 0,
      completedLessons: 0,
      currentStreak: 0,
      longestStreak: 0,
      lastLessonDate: new Date().toISOString(),
      vocabularyLearned: [],
      grammarPoints: [],
      pronunciationScore: 0,
      conversationScore: 0
    };

    this.users.push(user);
    this.saveToStorage();
    return user;
  }

  public getUser(id: string): UserProgress | null {
    return this.users.find(user => user.id === id) || null;
  }

  public updateUser(userId: string, updates: Partial<UserProgress>): boolean {
    const userIndex = this.users.findIndex(user => user.id === userId);
    if (userIndex === -1) return false;

    this.users[userIndex] = { ...this.users[userIndex], ...updates };
    this.saveToStorage();
    return true;
  }

  // Lesson management
  public addLesson(lesson: Omit<LessonRecord, 'id'>): LessonRecord {
    const newLesson: LessonRecord = {
      ...lesson,
      id: Date.now().toString()
    };

    this.lessons.push(newLesson);
    this.saveToStorage();
    return newLesson;
  }

  public getUserLessons(userId: string): LessonRecord[] {
    return this.lessons.filter(lesson => lesson.userId === userId);
  }

  public getRecentLessons(userId: string, limit: number = 5): LessonRecord[] {
    return this.getUserLessons(userId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, limit);
  }

  // Progress tracking with DeAcademy sync
  public async updateProgress(userId: string, lessonScore: number, topics: string[]): Promise<void> {
    const user = this.getUser(userId);
    if (!user) return;

    const today = new Date().toISOString().split('T')[0];
    const lastLessonDate = user.lastLessonDate.split('T')[0];
    
    // Update streak
    if (lastLessonDate === today) {
      // Same day, don't update streak
    } else if (new Date(today).getTime() - new Date(lastLessonDate).getTime() === 86400000) {
      // Consecutive day
      user.currentStreak += 1;
    } else {
      // Streak broken
      user.currentStreak = 1;
    }

    user.longestStreak = Math.max(user.longestStreak, user.currentStreak);
    user.completedLessons += 1;
    user.totalLessons += 1;
    user.lastLessonDate = new Date().toISOString();
    
    // Update scores (simple average)
    user.conversationScore = (user.conversationScore * (user.completedLessons - 1) + lessonScore) / user.completedLessons;
    
    // Add new vocabulary and grammar points
    topics.forEach(topic => {
      if (!user.vocabularyLearned.includes(topic)) {
        user.vocabularyLearned.push(topic);
      }
    });

    this.updateUser(userId, user);

    // Sync with DeAcademy
    await this.syncWithDeAcademy(userId, user, lessonScore, topics);
  }

  // DeAcademy synchronization with database
  private async syncWithDeAcademy(userId: string, user: UserProgress, lessonScore: number, topics: string[]): Promise<void> {
    try {
      // First, save to database
      await this.saveToDatabase(userId, user, lessonScore, topics);

      // Then sync with DeAcademy
      const progressData = {
        totalLessons: user.totalLessons,
        completedLessons: user.completedLessons,
        currentStreak: user.currentStreak,
        averageScore: user.conversationScore,
        level: user.level,
        vocabularyLearned: user.vocabularyLearned.length
      };

      const lessonData = {
        id: Date.now().toString(),
        score: lessonScore,
        topics,
        duration: 5 // Estimate 5 minutes per lesson
      };

      const response = await fetch('/api/deacademy-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          progressData,
          lessonData
        })
      });

      if (response.ok) {
        console.log('Successfully synced with DeAcademy');
      } else {
        console.warn('Failed to sync with DeAcademy:', response.status);
      }
    } catch (error) {
      console.warn('DeAcademy sync error:', error);
    }
  }

  // Save to PostgreSQL database
  private async saveToDatabase(userId: string, user: UserProgress, lessonScore: number, topics: string[]): Promise<void> {
    try {
      // Initialize user if not exists
      await fetch('/api/init-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          name: user.name,
          level: user.level
        })
      });

      // Add lesson to database
      await fetch('/api/user-progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          lessonData: {
            date: new Date().toISOString(),
            level: user.level,
            duration: 5,
            topics,
            score: lessonScore,
            feedback: 'Good progress!'
          }
        })
      });

      // Update user progress
      await fetch('/api/user-progress', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          stats: {
            totalLessons: user.totalLessons,
            completedLessons: user.completedLessons,
            currentStreak: user.currentStreak,
            longestStreak: user.longestStreak,
            averageScore: user.conversationScore,
            level: user.level,
            vocabularyLearned: user.vocabularyLearned
          }
        })
      });

      console.log('Successfully saved to database');
    } catch (error) {
      console.warn('Database save error:', error);
    }
  }

  // Statistics
  public getUserStats(userId: string): {
    totalLessons: number;
    averageScore: number;
    currentStreak: number;
    longestStreak: number;
    vocabularyCount: number;
    level: string;
  } {
    const user = this.getUser(userId);
    if (!user) {
      return {
        totalLessons: 0,
        averageScore: 0,
        currentStreak: 0,
        longestStreak: 0,
        vocabularyCount: 0,
        level: 'Beginner'
      };
    }

    return {
      totalLessons: user.completedLessons,
      averageScore: user.conversationScore,
      currentStreak: user.currentStreak,
      longestStreak: user.longestStreak,
      vocabularyCount: user.vocabularyLearned.length,
      level: user.level
    };
  }

  // Export/Import data
  public exportData(): string {
    return JSON.stringify({
      users: this.users,
      lessons: this.lessons,
      exportDate: new Date().toISOString()
    });
  }

  public importData(data: string): boolean {
    try {
      const imported = JSON.parse(data);
      if (imported.users && imported.lessons) {
        this.users = imported.users;
        this.lessons = imported.lessons;
        this.saveToStorage();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error importing data:', error);
      return false;
    }
  }
}

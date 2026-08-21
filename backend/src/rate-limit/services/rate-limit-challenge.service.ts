import { Injectable, Logger } from '@nestjs/common';
import { RateLimitViolationEntity } from '../entities/rate-limit-violation.entity';
import { RateLimitPolicyService } from './rate-limit-policy.service';

export interface ChallengeResult {
  required: boolean;
  challengeType?: 'captcha' | 'proof-of-work' | 'email-verification';
  challengeData?: any;
  expiresAt?: Date;
}

export interface ChallengeSolution {
  challengeId: string;
  solution: any;
}

@Injectable()
export class RateLimitChallengeService {
  private readonly logger = new Logger(RateLimitChallengeService.name);
  private readonly activeChallenges = new Map<string, {
    challengeData: any;
    expiresAt: Date;
    attempts: number;
  }>();
  private readonly challengeTTL = 300000; // 5 minutes
  private readonly maxAttempts = 3;

  constructor(
    private readonly policyService: RateLimitPolicyService,
  ) {}

  async shouldChallenge(
    userId: string | null,
    ipAddress: string | null,
    endpoint: string,
  ): Promise<ChallengeResult> {
    const recentViolations = await this.policyService.getViolations(
      userId || undefined,
      ipAddress || undefined,
      endpoint,
      10,
    );

    const violationCount = recentViolations.length;
    const timeSinceLastViolation = recentViolations.length > 0
      ? Date.now() - recentViolations[0].violatedAt.getTime()
      : Infinity;

    if (violationCount >= 5 && timeSinceLastViolation < 3600000) {
      return {
        required: true,
        challengeType: 'captcha',
        challengeData: this.generateCaptchaChallenge(),
        expiresAt: new Date(Date.now() + this.challengeTTL),
      };
    }

    if (violationCount >= 10 && timeSinceLastViolation < 1800000) {
      return {
        required: true,
        challengeType: 'proof-of-work',
        challengeData: this.generateProofOfWorkChallenge(),
        expiresAt: new Date(Date.now() + this.challengeTTL),
      };
    }

    return { required: false };
  }

  async createChallenge(
    identifier: string,
    challengeType: 'captcha' | 'proof-of-work' | 'email-verification',
  ): Promise<string> {
    const challengeId = this.generateChallengeId();
    const challengeData = this.generateChallengeData(challengeType);

    this.activeChallenges.set(challengeId, {
      challengeData,
      expiresAt: new Date(Date.now() + this.challengeTTL),
      attempts: 0,
    });

    this.logger.log(`Created ${challengeType} challenge for ${identifier}: ${challengeId}`);
    return challengeId;
  }

  async verifyChallenge(solution: ChallengeSolution): Promise<boolean> {
    const challenge = this.activeChallenges.get(solution.challengeId);

    if (!challenge) {
      this.logger.warn(`Challenge not found: ${solution.challengeId}`);
      return false;
    }

    if (challenge.expiresAt < new Date()) {
      this.activeChallenges.delete(solution.challengeId);
      this.logger.warn(`Challenge expired: ${solution.challengeId}`);
      return false;
    }

    if (challenge.attempts >= this.maxAttempts) {
      this.activeChallenges.delete(solution.challengeId);
      this.logger.warn(`Max attempts exceeded for challenge: ${solution.challengeId}`);
      return false;
    }

    challenge.attempts++;
    const isValid = this.validateSolution(challenge.challengeData, solution.solution);

    if (isValid) {
      this.activeChallenges.delete(solution.challengeId);
      this.logger.log(`Challenge solved successfully: ${solution.challengeId}`);
    } else {
      this.logger.warn(`Invalid solution for challenge: ${solution.challengeId}`);
    }

    return isValid;
  }

  private generateChallengeId(): string {
    return `challenge_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  private generateCaptchaChallenge(): any {
    return {
      type: 'captcha',
      difficulty: 'medium',
      // In production, integrate with a real CAPTCHA service like reCAPTCHA or hCaptcha
      provider: 'internal',
    };
  }

  private generateProofOfWorkChallenge(): any {
    const challenge = Math.random().toString(36).substring(2);
    const difficulty = 4; // Number of leading zeros required
    return {
      type: 'proof-of-work',
      challenge,
      difficulty,
      algorithm: 'sha256',
    };
  }

  private generateChallengeData(challengeType: string): any {
    switch (challengeType) {
      case 'captcha':
        return this.generateCaptchaChallenge();
      case 'proof-of-work':
        return this.generateProofOfWorkChallenge();
      case 'email-verification':
        return {
          type: 'email-verification',
          code: Math.floor(100000 + Math.random() * 900000).toString(),
        };
      default:
        throw new Error(`Unknown challenge type: ${challengeType}`);
    }
  }

  private validateSolution(challengeData: any, solution: any): boolean {
    switch (challengeData.type) {
      case 'captcha':
        return this.validateCaptchaSolution(challengeData, solution);
      case 'proof-of-work':
        return this.validateProofOfWorkSolution(challengeData, solution);
      case 'email-verification':
        return this.validateEmailVerificationSolution(challengeData, solution);
      default:
        return false;
    }
  }

  private validateCaptchaSolution(challengeData: any, solution: any): boolean {
    // In production, validate with the CAPTCHA provider
    return solution.token && solution.token.length > 0;
  }

  private validateProofOfWorkSolution(challengeData: any, solution: any): boolean {
    // Validate proof-of-work solution
    // This is a simplified version - in production, implement proper PoW validation
    const { challenge, difficulty } = challengeData;
    const { nonce } = solution;

    if (!nonce) return false;

    const hash = this.simpleHash(challenge + nonce);
    return hash.startsWith('0'.repeat(difficulty));
  }

  private validateEmailVerificationSolution(challengeData: any, solution: any): boolean {
    return challengeData.code === solution.code;
  }

  private simpleHash(input: string): string {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }

  private generateChallenge(challengeType: 'captcha' | 'proof-of-work'): any {
    switch (challengeType) {
      case 'captcha':
        return this.generateCaptchaChallenge();
      case 'proof-of-work':
        return this.generateProofOfWorkChallenge();
      default:
        throw new Error(`Unknown challenge type: ${challengeType}`);
    }
  }

  cleanupExpiredChallenges(): void {
    const now = new Date();
    let cleaned = 0;

    for (const [challengeId, challenge] of this.activeChallenges.entries()) {
      if (challenge.expiresAt < now) {
        this.activeChallenges.delete(challengeId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.debug(`Cleaned up ${cleaned} expired challenges`);
    }
  }

  getActiveChallengeCount(): number {
    return this.activeChallenges.size;
  }
}

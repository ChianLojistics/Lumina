import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { sha256 } from '@noble/hashes/sha256';

enum NodeState {
  FOLLOWER = 'follower',
  CANDIDATE = 'candidate',
  LEADER = 'leader',
}

interface LogEntry {
  index: number;
  term: number;
  data: any;
  hash: string;
}

interface RaftNode {
  id: string;
  address: string;
  state: NodeState;
  currentTerm: number;
  votedFor: string | null;
  log: LogEntry[];
  commitIndex: number;
  lastApplied: number;
  nextIndex: Map<string, number>;
  matchIndex: Map<string, number>;
}

@Injectable()
export class RaftConsensusService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RaftConsensusService.name);
  private node: RaftNode;
  private nodes: RaftNode[] = [];
  private electionTimeout: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private readonly ELECTION_TIMEOUT_MIN = 5000;
  private readonly ELECTION_TIMEOUT_MAX = 10000;
  private readonly HEARTBEAT_INTERVAL = 2000;

  constructor() {
    this.node = this.initializeNode();
  }

  onModuleInit() {
    this.startElectionTimer();
    this.logger.log('Raft consensus service initialized');
  }

  onModuleDestroy() {
    this.stopElectionTimer();
    this.stopHeartbeat();
  }

  private initializeNode(): RaftNode {
    const nodeId = process.env.RAFT_NODE_ID || 'node-1';
    return {
      id: nodeId,
      address: process.env.RAFT_NODE_ADDRESS || 'localhost:5000',
      state: NodeState.FOLLOWER,
      currentTerm: 0,
      votedFor: null,
      log: [],
      commitIndex: 0,
      lastApplied: 0,
      nextIndex: new Map(),
      matchIndex: new Map(),
    };
  }

  /**
   * Configure cluster nodes
   */
  configureCluster(nodeConfigs: { id: string; address: string }[]) {
    this.nodes = nodeConfigs.map(config => ({
      ...config,
      state: NodeState.FOLLOWER,
      currentTerm: 0,
      votedFor: null,
      log: [],
      commitIndex: 0,
      lastApplied: 0,
      nextIndex: new Map(),
      matchIndex: new Map(),
    }));

    this.logger.log(`Cluster configured with ${this.nodes.length} nodes`);
  }

  /**
   * Start election timer
   */
  private startElectionTimer() {
    const timeout = this.randomTimeout();
    this.electionTimeout = setTimeout(() => {
      this.startElection();
    }, timeout);
  }

  /**
   * Stop election timer
   */
  private stopElectionTimer() {
    if (this.electionTimeout) {
      clearTimeout(this.electionTimeout);
      this.electionTimeout = null;
    }
  }

  /**
   * Reset election timer
   */
  private resetElectionTimer() {
    this.stopElectionTimer();
    this.startElectionTimer();
  }

  /**
   * Generate random timeout
   */
  private randomTimeout(): number {
    return Math.floor(
      Math.random() * (this.ELECTION_TIMEOUT_MAX - this.ELECTION_TIMEOUT_MIN) +
        this.ELECTION_TIMEOUT_MIN,
    );
  }

  /**
   * Start election
   */
  private startElection() {
    this.node.state = NodeState.CANDIDATE;
    this.node.currentTerm++;
    this.node.votedFor = this.node.id;
    this.logger.log(`Starting election for term ${this.node.currentTerm}`);

    // Request votes from other nodes
    const votesGranted = 1; // Vote for self
    const votesNeeded = Math.floor(this.nodes.length / 2) + 1;

    // Simulate vote requests (in production, this would be actual RPC calls)
    const otherVotes = this.simulateVoteRequests();
    const totalVotes = votesGranted + otherVotes;

    if (totalVotes >= votesNeeded) {
      this.becomeLeader();
    } else {
      this.node.state = NodeState.FOLLOWER;
      this.resetElectionTimer();
    }
  }

  /**
   * Simulate vote requests (placeholder for actual RPC)
   */
  private simulateVoteRequests(): number {
    // In production, this would make actual RPC calls to other nodes
    // For now, we'll simulate a successful election in single-node mode
    if (this.nodes.length <= 1) {
      return 0;
    }
    return Math.floor(Math.random() * this.nodes.length);
  }

  /**
   * Become leader
   */
  private becomeLeader() {
    this.node.state = NodeState.LEADER;
    this.logger.log(`Became leader for term ${this.node.currentTerm}`);
    this.stopElectionTimer();
    this.startHeartbeat();
  }

  /**
   * Start heartbeat
   */
  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, this.HEARTBEAT_INTERVAL);
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Send heartbeat to followers
   */
  private sendHeartbeat() {
    // In production, this would send AppendEntries RPC to all followers
    this.logger.debug('Sending heartbeat to followers');
  }

  /**
   * Propose entry to log
   */
  async proposeEntry(data: any): Promise<boolean> {
    if (this.node.state !== NodeState.LEADER) {
      throw new Error('Only leader can propose entries');
    }

    const entry: LogEntry = {
      index: this.node.log.length + 1,
      term: this.node.currentTerm,
      data,
      hash: this.hashEntry(data),
    };

    this.node.log.push(entry);
    this.logger.log(`Proposed entry ${entry.index} for term ${entry.term}`);

    // Replicate to followers (simulated)
    const replicated = await this.replicateToFollowers(entry);
    
    if (replicated) {
      this.node.commitIndex = entry.index;
      return true;
    }

    return false;
  }

  /**
   * Replicate entry to followers
   */
  private async replicateToFollowers(entry: LogEntry): Promise<boolean> {
    // In production, this would use AppendEntries RPC
    // For now, we'll simulate successful replication
    return true;
  }

  /**
   * Hash entry data
   */
  private hashEntry(data: any): string {
    const serialized = JSON.stringify(data);
    const hash = sha256(serialized);
    return Buffer.from(hash).toString('hex');
  }

  /**
   * Get current node state
   */
  getNodeState() {
    return {
      id: this.node.id,
      state: this.node.state,
      currentTerm: this.node.currentTerm,
      commitIndex: this.node.commitIndex,
      logLength: this.node.log.length,
      isLeader: this.node.state === NodeState.LEADER,
    };
  }

  /**
   * Get cluster health
   */
  getClusterHealth() {
    return {
      nodes: this.nodes.length,
      leader: this.node.state === NodeState.LEADER ? this.node.id : 'unknown',
      currentTerm: this.node.currentTerm,
      commitIndex: this.node.commitIndex,
      consensusReached: this.node.state === NodeState.LEADER,
    };
  }

  /**
   * Step down as leader
   */
  stepDown() {
    if (this.node.state === NodeState.LEADER) {
      this.node.state = NodeState.FOLLOWER;
      this.stopHeartbeat();
      this.resetElectionTimer();
      this.logger.log('Stepped down as leader');
    }
  }

  /**
   * Request vote (RPC handler)
   */
  requestVote(term: number, candidateId: string): { voteGranted: boolean; currentTerm: number } {
    if (term > this.node.currentTerm) {
      this.node.currentTerm = term;
      this.node.votedFor = null;
      this.node.state = NodeState.FOLLOWER;
      this.stopHeartbeat();
    }

    const voteGranted =
      term === this.node.currentTerm &&
      (this.node.votedFor === null || this.node.votedFor === candidateId);

    if (voteGranted) {
      this.node.votedFor = candidateId;
      this.resetElectionTimer();
    }

    return { voteGranted, currentTerm: this.node.currentTerm };
  }

  /**
   * Append entries (RPC handler)
   */
  appendEntries(
    term: number,
    leaderId: string,
    prevLogIndex: number,
    prevLogTerm: number,
    entries: LogEntry[],
    leaderCommit: number,
  ): { success: boolean; currentTerm: number } {
    if (term > this.node.currentTerm) {
      this.node.currentTerm = term;
      this.node.state = NodeState.FOLLOWER;
      this.node.votedFor = null;
      this.stopHeartbeat();
    }

    if (term < this.node.currentTerm) {
      return { success: false, currentTerm: this.node.currentTerm };
    }

    // Check if log matches
    if (
      prevLogIndex > 0 &&
      (this.node.log[prevLogIndex - 1]?.term !== prevLogTerm ||
        this.node.log[prevLogIndex - 1]?.index !== prevLogIndex)
    ) {
      return { success: false, currentTerm: this.node.currentTerm };
    }

    // Append new entries
    for (const entry of entries) {
      if (entry.index <= this.node.log.length) {
        this.node.log[entry.index - 1] = entry;
      } else {
        this.node.log.push(entry);
      }
    }

    // Update commit index
    if (leaderCommit > this.node.commitIndex) {
      this.node.commitIndex = Math.min(leaderCommit, this.node.log.length);
    }

    this.resetElectionTimer();
    return { success: true, currentTerm: this.node.currentTerm };
  }
}

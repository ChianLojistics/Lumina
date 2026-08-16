import { Injectable, Logger } from '@nestjs/common';
import { sha256 } from '@noble/hashes/sha256';

interface MerkleNode {
  hash: string;
  left?: MerkleNode;
  right?: MerkleNode;
}

interface MerkleProof {
  hash: string;
  position: 'left' | 'right';
}

@Injectable()
export class MerkleTreeService {
  private readonly logger = new Logger(MerkleTreeService.name);

  /**
   * Create a Merkle tree from an array of data
   */
  createTree(data: string[]): MerkleNode {
    if (data.length === 0) {
      throw new Error('Cannot create Merkle tree from empty data');
    }

    const leaves = data.map(item => this.hash(item));
    return this.buildTree(leaves);
  }

  /**
   * Build Merkle tree from leaf hashes
   */
  private buildTree(hashes: string[]): MerkleNode {
    if (hashes.length === 1) {
      return { hash: hashes[0] };
    }

    const nextLevel: string[] = [];
    for (let i = 0; i < hashes.length; i += 2) {
      const left = hashes[i];
      const right = i + 1 < hashes.length ? hashes[i + 1] : left;
      const combined = left + right;
      nextLevel.push(this.hash(combined));
    }

    return this.buildTree(nextLevel);
  }

  /**
   * Get the root hash of the Merkle tree
   */
  getRootHash(data: string[]): string {
    const tree = this.createTree(data);
    return tree.hash;
  }

  /**
   * Generate a Merkle proof for a specific leaf
   */
  generateProof(data: string[], index: number): MerkleProof[] {
    if (index < 0 || index >= data.length) {
      throw new Error('Index out of bounds');
    }

    const leaves = data.map(item => this.hash(item));
    const proof: MerkleProof[] = [];
    let currentLevel = leaves;
    let currentIndex = index;

    while (currentLevel.length > 1) {
      const isLeft = currentIndex % 2 === 0;
      const siblingIndex = isLeft ? currentIndex + 1 : currentIndex - 1;

      if (siblingIndex < currentLevel.length) {
        proof.push({
          hash: currentLevel[siblingIndex],
          position: isLeft ? 'right' : 'left',
        });
      }

      currentIndex = Math.floor(currentIndex / 2);
      const nextLevel: string[] = [];

      for (let i = 0; i < currentLevel.length; i += 2) {
        const left = currentLevel[i];
        const right = i + 1 < currentLevel.length ? currentLevel[i + 1] : left;
        const combined = left + right;
        nextLevel.push(this.hash(combined));
      }

      currentLevel = nextLevel;
    }

    return proof;
  }

  /**
   * Verify a Merkle proof
   */
  verifyProof(
    leafHash: string,
    proof: MerkleProof[],
    rootHash: string,
  ): boolean {
    let currentHash = leafHash;

    for (const proofNode of proof) {
      if (proofNode.position === 'left') {
        currentHash = this.hash(proofNode.hash + currentHash);
      } else {
        currentHash = this.hash(currentHash + proofNode.hash);
      }
    }

    return currentHash === rootHash;
  }

  /**
   * Hash a string using SHA-256
   */
  private hash(data: string): string {
    const hash = sha256(data);
    return Buffer.from(hash).toString('hex');
  }

  /**
   * Serialize a Merkle proof to JSON
   */
  serializeProof(proof: MerkleProof[]): string {
    return JSON.stringify(proof);
  }

  /**
   * Deserialize a Merkle proof from JSON
   */
  deserializeProof(serialized: string): MerkleProof[] {
    return JSON.parse(serialized);
  }
}

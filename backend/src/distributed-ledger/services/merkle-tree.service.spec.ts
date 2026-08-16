import { Test, TestingModule } from '@nestjs/testing';
import { MerkleTreeService } from './merkle-tree.service';

describe('MerkleTreeService', () => {
  let service: MerkleTreeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MerkleTreeService],
    }).compile();

    service = module.get<MerkleTreeService>(MerkleTreeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createTree', () => {
    it('should create a Merkle tree from data', () => {
      const data = ['entry1', 'entry2', 'entry3'];
      const tree = service.createTree(data);
      expect(tree).toBeDefined();
      expect(tree.hash).toBeDefined();
    });

    it('should throw error for empty data', () => {
      expect(() => service.createTree([])).toThrow('Cannot create Merkle tree from empty data');
    });

    it('should handle single entry', () => {
      const data = ['entry1'];
      const tree = service.createTree(data);
      expect(tree.hash).toBeDefined();
    });

    it('should handle odd number of entries', () => {
      const data = ['entry1', 'entry2', 'entry3', 'entry4', 'entry5'];
      const tree = service.createTree(data);
      expect(tree.hash).toBeDefined();
    });
  });

  describe('getRootHash', () => {
    it('should return consistent hash for same data', () => {
      const data = ['entry1', 'entry2', 'entry3'];
      const hash1 = service.getRootHash(data);
      const hash2 = service.getRootHash(data);
      expect(hash1).toBe(hash2);
    });

    it('should return different hash for different data', () => {
      const data1 = ['entry1', 'entry2'];
      const data2 = ['entry1', 'entry3'];
      const hash1 = service.getRootHash(data1);
      const hash2 = service.getRootHash(data2);
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('generateProof', () => {
    it('should generate proof for valid index', () => {
      const data = ['entry1', 'entry2', 'entry3', 'entry4'];
      const proof = service.generateProof(data, 0);
      expect(proof).toBeDefined();
      expect(Array.isArray(proof)).toBe(true);
    });

    it('should throw error for invalid index', () => {
      const data = ['entry1', 'entry2'];
      expect(() => service.generateProof(data, 5)).toThrow('Index out of bounds');
      expect(() => service.generateProof(data, -1)).toThrow('Index out of bounds');
    });

    it('should generate proof for last index', () => {
      const data = ['entry1', 'entry2', 'entry3'];
      const proof = service.generateProof(data, 2);
      expect(proof).toBeDefined();
    });
  });

  describe('verifyProof', () => {
    it('should verify valid proof', () => {
      const data = ['entry1', 'entry2', 'entry3', 'entry4'];
      const index = 1;
      const proof = service.generateProof(data, index);
      const rootHash = service.getRootHash(data);
      const leafHash = service.hash(JSON.stringify(data[index]));
      
      const isValid = service.verifyProof(leafHash, proof, rootHash);
      expect(isValid).toBe(true);
    });

    it('should reject invalid proof', () => {
      const data = ['entry1', 'entry2', 'entry3', 'entry4'];
      const proof = service.generateProof(data, 0);
      const rootHash = service.getRootHash(data);
      const invalidLeafHash = 'invalidhash';
      
      const isValid = service.verifyProof(invalidLeafHash, proof, rootHash);
      expect(isValid).toBe(false);
    });

    it('should reject proof with wrong root hash', () => {
      const data = ['entry1', 'entry2', 'entry3', 'entry4'];
      const proof = service.generateProof(data, 0);
      const wrongRootHash = 'wrongroothash';
      const leafHash = service.hash(JSON.stringify(data[0]));
      
      const isValid = service.verifyProof(leafHash, proof, wrongRootHash);
      expect(isValid).toBe(false);
    });
  });

  describe('serializeProof and deserializeProof', () => {
    it('should serialize and deserialize proof correctly', () => {
      const data = ['entry1', 'entry2', 'entry3'];
      const proof = service.generateProof(data, 0);
      const serialized = service.serializeProof(proof);
      const deserialized = service.deserializeProof(serialized);
      
      expect(deserialized).toEqual(proof);
    });
  });

  describe('hash', () => {
    it('should return consistent hash for same input', () => {
      const input = 'test data';
      // Access private method through testing
      const hash1 = service['hash'](input);
      const hash2 = service['hash'](input);
      expect(hash1).toBe(hash2);
    });

    it('should return different hash for different input', () => {
      const input1 = 'test data 1';
      const input2 = 'test data 2';
      const hash1 = service['hash'](input1);
      const hash2 = service['hash'](input2);
      expect(hash1).not.toBe(hash2);
    });
  });
});

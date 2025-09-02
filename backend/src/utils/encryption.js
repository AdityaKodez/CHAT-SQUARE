import bcrypt from "bcryptjs";

// Salt rounds for bcrypt hashing
const SALT_ROUNDS = 12;

/**
 * Encrypt message content using bcrypt
 * @param {string} content - The message content to encrypt
 * @returns {Promise<string>} - The encrypted content
 */
export const encryptContent = async (content) => {
    try {
        if (!content || typeof content !== 'string') {
            throw new Error('Content must be a non-empty string');
        }
        
        // Generate salt and hash the content
        const salt = await bcrypt.genSalt(SALT_ROUNDS);
        const encryptedContent = await bcrypt.hash(content, salt);
        
        return encryptedContent;
    } catch (error) {
        console.error('Error encrypting content:', error);
        throw new Error('Failed to encrypt content');
    }
};

/**
 * Note: bcrypt is a one-way hashing algorithm, so we can't decrypt it back to original text.
 * For chat applications, we need a two-way encryption method like AES.
 * Let's use crypto instead for proper encryption/decryption.
 */

import crypto from 'crypto';

// AES encryption configuration
const ALGORITHM = 'aes-256-cbc';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32); // 32 bytes key
const IV_LENGTH = 16; // For AES, this is always 16

/**
 * Encrypt message content using AES-256-CBC
 * @param {string} content - The message content to encrypt
 * @returns {string} - The encrypted content (base64 encoded)
 */
export const encryptMessage = (content) => {
    try {
        if (!content || typeof content !== 'string') {
            throw new Error('Content must be a non-empty string');
        }

        const iv = crypto.randomBytes(IV_LENGTH);
        const cipher = crypto.createCipher(ALGORITHM, ENCRYPTION_KEY);
        
        let encrypted = cipher.update(content, 'utf8', 'base64');
        encrypted += cipher.final('base64');
        
        // Combine IV and encrypted content, separated by ':'
        return `${iv.toString('base64')}:${encrypted}`;
    } catch (error) {
        console.error('Error encrypting message:', error);
        throw new Error('Failed to encrypt message');
    }
};

/**
 * Decrypt message content using AES-256-CBC
 * @param {string} encryptedContent - The encrypted content (base64 encoded with IV)
 * @returns {string} - The decrypted content
 */
export const decryptMessage = (encryptedContent) => {
    try {
        if (!encryptedContent || typeof encryptedContent !== 'string') {
            throw new Error('Encrypted content must be a non-empty string');
        }

        const parts = encryptedContent.split(':');
        if (parts.length !== 2) {
            throw new Error('Invalid encrypted content format');
        }

        const iv = Buffer.from(parts[0], 'base64');
        const encrypted = parts[1];
        
        const decipher = crypto.createDecipher(ALGORITHM, ENCRYPTION_KEY);
        
        let decrypted = decipher.update(encrypted, 'base64', 'utf8');
        decrypted += decipher.final('utf8');
        
        return decrypted;
    } catch (error) {
        console.error('Error decrypting message:', error);
        throw new Error('Failed to decrypt message');
    }
};

/**
 * Helper function to check if content is encrypted
 * @param {string} content - The content to check
 * @returns {boolean} - True if content appears to be encrypted
 */
export const isEncrypted = (content) => {
    if (!content || typeof content !== 'string') {
        return false;
    }
    
    // Check if content has the encrypted format (base64:base64)
    const parts = content.split(':');
    if (parts.length !== 2) {
        return false;
    }
    
    try {
        // Try to decode both parts as base64
        Buffer.from(parts[0], 'base64');
        Buffer.from(parts[1], 'base64');
        return true;
    } catch {
        return false;
    }
};

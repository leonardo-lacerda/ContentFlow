import { UrlValidator } from '../url-validator';

describe('UrlValidator', () => {
  describe('validate', () => {
    it('should reject invalid URL format', async () => {
      const result = await UrlValidator.validate('not-a-url');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('URL inválida');
    });

    it('should reject non-http protocols', async () => {
      const result = await UrlValidator.validate('file:///etc/passwd');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Protocolo não permitido');
    });

    it('should reject ftp protocol', async () => {
      const result = await UrlValidator.validate('ftp://example.com/file');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Protocolo não permitido');
    });

    it('should reject gopher protocol', async () => {
      const result = await UrlValidator.validate('gopher://localhost:6379/');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Protocolo não permitido');
    });

    it('should reject localhost', async () => {
      const result = await UrlValidator.validate('http://localhost:3000/admin');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Hostname bloqueado');
    });

    it('should reject localhost.localdomain', async () => {
      const result = await UrlValidator.validate('http://localhost.localdomain/');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Hostname bloqueado');
    });

    it('should reject 127.0.0.1', async () => {
      const result = await UrlValidator.validate('http://127.0.0.1/admin');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('IP privado não permitido');
    });

    it('should reject 10.x.x.x (private class A)', async () => {
      const result = await UrlValidator.validate('http://10.0.0.1/');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('IP privado não permitido');
    });

    it('should reject 172.16.x.x (private class B)', async () => {
      const result = await UrlValidator.validate('http://172.16.0.1/');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('IP privado não permitido');
    });

    it('should reject 192.168.x.x (private class C)', async () => {
      const result = await UrlValidator.validate('http://192.168.1.1/');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('IP privado não permitido');
    });

    it('should reject cloud metadata endpoint', async () => {
      const result = await UrlValidator.validate('http://169.254.169.254/latest/meta-data/');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Hostname bloqueado');
    });

    it('should reject 0.0.0.0', async () => {
      const result = await UrlValidator.validate('http://0.0.0.0/');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('IP privado não permitido');
    });

    it('should reject IPv6 loopback ::1', async () => {
      const result = await UrlValidator.validate('http://[::1]/');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('IPv6 privado');
    });

    it('should accept valid public URL', async () => {
      // Note: DNS resolution might fail in test env, but validation should pass
      const result = await UrlValidator.validate('https://example.com/page');
      // If DNS fails, it's still allowed (soft fail)
      expect(result.valid).toBe(true);
    });

    it('should accept URL with port', async () => {
      const result = await UrlValidator.validate('https://example.com:8080/api');
      expect(result.valid).toBe(true);
    });
  });

  describe('isPrivateIP (via validate)', () => {
    const privateIPs = [
      '127.0.0.1',
      '127.0.0.2',
      '10.0.0.1',
      '10.255.255.255',
      '172.16.0.1',
      '172.31.255.255',
      '192.168.0.1',
      '192.168.255.255',
      '169.254.0.1',
      '169.254.255.255',
      '0.0.0.0',
    ];

    privateIPs.forEach((ip) => {
      it(`should block ${ip}`, async () => {
        const result = await UrlValidator.validate(`http://${ip}/`);
        expect(result.valid).toBe(false);
      });
    });
  });
});

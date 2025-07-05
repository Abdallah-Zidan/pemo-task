import axios from 'axios';

describe('GET /health', () => {
  it('should return ok status', async () => {
    try {
      const res = await axios.get('/health');

      expect(res.status).toBe(200);
      expect(res.data).toEqual({ status: 'ok' });
    } catch (error) {
      console.log('error', error);
      throw new Error(`Health check failed: ${error}`);
    }
  });
});

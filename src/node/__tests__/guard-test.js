const { Guard } = require('../guard');

describe('Guard', () => {
    it('should guard correctly', (done) => {
        const guard = new Guard();
        expect(guard.isAllowed('localhost')).toBeTruthy;
        expect(guard.isAllowed('localhost')).toBeFalsy;
        setTimeout(() => {
            expect(guard.isAllowed('localhost')).toBeTruthy;
            expect(guard.isAllowed('localhost')).toBeFalsy;
            setTimeout(() => {
                expect(guard.isAllowed('localhost')).toBeFalsy;
                done();
            }, 1001);
        }, 2001);
    });
});

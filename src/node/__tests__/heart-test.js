const { Heart } = require('../heart');

describe('Heart', () => {
    it('doesnt tick, if not started', (done) => {
       const heart = new Heart({ cycleInterval: 1, epochInterval: 3, silent: true });
       setTimeout(() => {
           expect(heart.personality.id).toBeFalsy;
           done();
       }, 4000);
    }, 5000);

    it('ticks when started', (done) => {
        const heart = new Heart({ cycleInterval: 1, epochInterval: 3, silent: true, autoStart: true });
        setTimeout(() => {
            expect(heart.personality.id).toBeTruthy;
            done();
        }, 2000);
    }, 3000);

    it('ticks when started #2', (done) => {
        const heart = new Heart({ cycleInterval: 1, epochInterval: 3, silent: true });
        heart.start();
        setTimeout(() => {
            expect(heart.personality.id).toBeTruthy;
            done();
        }, 2000);
    }, 3000);

    it('updates personality correctly', (done) => {
        const heart = new Heart({ cycleInterval: 1, epochInterval: 2, silent: true, autoStart: true });
        const p1 = heart.personality;

        setTimeout(() => {
            const p2 = heart.personality;
            console.log(p2);
            expect(p1).not.toEqual(p2);
            setTimeout(() => {
                const p3 = heart.personality;
                console.log(p3);
                expect(p3).not.toEqual(p2);
                expect(p3).not.toEqual(p1);
                done();
            }, 2100);
        }, 2100);
    }, 10000);

    it('Does not update personality, if epoch off', (done) => {
        const heart = new Heart({
            cycleInterval: 1,
            epochInterval: 2,
            silent: true,
            autoStart: true,
            onEpoch: () => Promise.resolve(true)
        });
        const p1 = heart.personality;

        setTimeout(() => {
            const p2 = heart.personality;
            expect(p1).toEqual(p2);
            setTimeout(() => {
                const p3 = heart.personality;
                expect(p3).toEqual(p2);
                done();
            }, 2100);
        }, 2100);
    }, 7000);

    it('Does not update personality #2, if cycle off', (done) => {
        const heart = new Heart({
            cycleInterval: 1,
            epochInterval: 2,
            silent: true,
            autoStart: true,
            onCycle: () => Promise.resolve(true)
        });
        const p1 = heart.personality;

        setTimeout(() => {
            const p2 = heart.personality;
            expect(p1).toEqual(p2);
            setTimeout(() => {
                const p3 = heart.personality;
                expect(p3).toEqual(p2);
                done();
            }, 2100);
        }, 2100);
    }, 7000);
});

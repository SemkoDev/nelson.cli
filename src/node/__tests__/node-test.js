const { Node } = require('../node');
const { IRI } = require('../iri');

jest.mock('../iri');

const DEFAULT_OPTIONS = {
    localNodes: true,
    beatInterval: 2,
    cycleInterval: 3,
    epochInterval: 30,
    lazyLimit: 6,
    testnet: true,
    temporary: true,
};

describe('Node', () => {
    it('should mock IRI correctly', () => {
        expect(IRI.isMocked).toBeTruthy;
    });

    it('should initialize Node correctly', (done) => {
        const node = new Node({ ...DEFAULT_OPTIONS, silent: true });
        node.start().then((n) => {
            expect(n.iri && n.iri.isAvailable()).toBeTruthy;
            expect(n.heart && n.heart.personality && n.heart.personality.id).toBeTruthy;
            node.end().then(done);
        }).catch(done);
    });
});

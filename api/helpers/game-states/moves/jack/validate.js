const GamePhase = require('../../../../../utils/GamePhase.json');
const BadRequestError = require('../../../../errors/badRequestError');

module.exports = {
  friendlyName: 'Validate request to play Jack',

  description: 'Verifies whether a request to play a Jack is legal, throwing explanatory error if not.',

  inputs: {
    currentState: {
      type: 'ref',
      description: 'Object containing the current gameState',
      required: true,
    },
    /**
     * @param { Object } requestedMove - Object describing the request to play Jack
     * @param { String } requestedMove.cardId - Card Played (Jack)
     * @param { String } [ requestedMove.targetId ] - Card targeted by Jack
     */
    requestedMove: {
      type: 'ref',
      description: 'Object containing data needed for current move',
      required: true,
    },
    playedBy: {
      type: 'number',
      description: 'Player number of player requesting move',
      required: true,
    },
    priorStates: {
      type: 'ref',
      description: 'List of packed gameStateRows for this game\'s prior states',
      required: true,
    }
  },
  sync: true,

  fn: ({ currentState, requestedMove, playedBy }, exits) => {
    try {
      const player = playedBy ? currentState.p1 : currentState.p0;
      const opponent = playedBy ? currentState.p0 : currentState.p1;

      const playedCard = player.hand.find(({ id }) => id === requestedMove.cardId);
      const targetCard = opponent.points.find(({ id }) => id === requestedMove.targetId);

      // GameState phase should be MAIN
      if (currentState.phase !== GamePhase.MAIN) {
        throw new BadRequestError('game.snackbar.global.notInMainPhase');
      }

      // Must be player's turn
      if (currentState.turn % 2 !== playedBy) {
        throw new BadRequestError('game.snackbar.global.notYourTurn');
      }

      // playedCard must be in player's hand
      if (!playedCard) {
        throw new BadRequestError('game.snackbar.global.playFromHand');
      }

      // playedCard must be a jack
      if (playedCard.rank !== 11) {
        throw new BadRequestError('game.snackbar.jack.stealOnlyPointCards');
      }

      // targetCard must be in opponent's points
      if (!targetCard) {
        throw new BadRequestError('game.snackbar.jack.stealOnlyPointCards');
      }

      // playedCard must not be frozen
      if (playedCard.isFrozen) {
        throw new BadRequestError('game.snackbar.global.cardFrozen');
      }

      // Can't jack if opponent has queen
      const queenCount = opponent.faceCards.filter(({ rank }) => rank === 12).length;
      if (queenCount > 0) {
        throw new BadRequestError('game.snackbar.jack.noJackWithQueen');
      }

      return exits.success();
    } catch (err) {
      return exits.error(err);
    }
  },
};

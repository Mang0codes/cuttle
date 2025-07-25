const GamePhase = require('../../../../../utils/GamePhase.json');

module.exports = {
  friendlyName: 'Execute request for Stalemate',

  description: 'Submits a request for a statlemate',

  inputs: {
    currentState: {
      type: 'ref',
      descriptions: 'Object containing the current game state',
      required: true,
    },
    /**
     * @param { Object } requestedMove - Object describing the request for stalemate
     * @param { MoveType.STALEMATE_REQUEST } requestedMove.moveType - Specifies that this a request for a stalemate
     * @param { 1 | 0 } requestedMove.playedBy - Which player is requesting a stalemate
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
    let result = _.cloneDeep(currentState);

    result = {
      ...result,
      ...requestedMove,
      playedBy,
      phase: GamePhase.CONSIDERING_STALEMATE,
    };

    return exits.success(result);
  },
};

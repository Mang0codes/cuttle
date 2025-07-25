import { myUser, opponentOne, opponentTwo } from '../../fixtures/userFixtures';
import { assertSnackbar } from '../../support/helpers';
import { SnackBarError } from '../../fixtures/snackbarError';
import { announcementData } from '../../../../src/routes/home/components/announcementDialog/data/announcementData';

function setup(isRanked = false) {
  cy.wipeDatabase();
  cy.visit('/');
  window.localStorage.setItem('announcement', announcementData.id);
  cy.signupPlayer(myUser);
  cy.createGamePlayer({ gameName: 'Test Game', isRanked }).then((gameSummary) => {
    cy.window()
      .its('cuttle.gameStore')
      .then((store) => store.requestSubscribe(gameSummary.gameId));
    cy.vueRoute(`/lobby/${gameSummary.gameId}`);
    cy.wrap(gameSummary).as('gameSummary');
  });
}

function checkRanked(ranked) {
  cy.window()
    .its('cuttle.gameStore')
    .then((game) => {
      expect(game.isRanked).to.eq(ranked);
    });
}

function assertGameStarted(noMovesYet = true) {
  cy.url().should('include', '/game');
  cy.window()
    .its('cuttle.gameStore')
    .then((game) => {
      expect(game.players[1].hand.length).to.eq(6);
      if (noMovesYet) {
        expect(game.players.length).to.eq(2);
        expect(game.players[0].hand.length).to.eq(5);
        expect(game.deck.length).to.eq(39);
      }
      expect(game.topCard.rank).to.be.greaterThan(0);
      expect(game.secondCard.rank).to.be.greaterThan(0);
      expect(game.scrap.length).to.eq(0);
      expect(game.twos.length).to.eq(0);
    });
}

describe('Lobby - Page Content', () => {
  beforeEach(() => {
    setup();
  });

  it('Displays static content', () => {
    cy.contains('h1', 'Lobby for');
    cy.contains('h5', 'Test Game');

    cy.contains('button.v-btn', 'EXIT');
    cy.contains('button.v-btn', 'READY');
    cy.get('[data-cy=nav-drawer]').should('not.exist');
  });

  it('Shows both players indicators', () => {
    cy.get('[data-cy=my-indicator]').contains(myUser.username)
      .should('not.contain', '@');
    cy.get('[data-cy=my-indicator]').find('[data-cy="lobby-back-card"]')
      .should('exist');
    cy.get('[data-cy=opponent-indicator]').contains('Invite');
  });

  it('Player concedes, goes home, joins new game created by new user, and both are not ready', function () {
    const { gameId } = this.gameSummary;
    // 1. Player hits ready
    cy.get('[data-cy=ready-button]').click();
    cy.get('[data-cy=my-indicator] [data-cy="lobby-ready-card"]')
      .should('exist');

    // 2. Opponent Signs up and readies
    cy.signupOpponent(opponentOne);
    cy.subscribeOpponent(gameId);
    cy.readyOpponent(gameId);
    cy.get('[data-cy=opponent-indicator]').find('[data-cy="lobby-ready-card"]')
      .should('exist');

    // 3. Player readies (game starts)
    cy.get('[data-cy=ready-button]').click();

    // 3. Verify game has started (should be in /game and have hand)
    cy.url().should('include', '/game');
    cy.get('[data-player-hand-card]').should('exist');

    // 4. Signup a new user (opponentTwo)
    cy.signupOpponent(opponentTwo);
    // 5. New user creates and joins a game
    cy.createGameOpponent('Second Game').then((newGameSummary) => {
      cy.subscribeOpponent(newGameSummary.gameId);
      // 6. Player concedes using the game menu
      cy.get('#game-menu-activator').click();
      cy.get('#game-menu').should('be.visible')
        .get('[data-cy=concede-initiate]')
        .click();
      cy.get('#request-gameover-dialog').should('be.visible')
        .get('[data-cy=request-gameover-confirm]')
        .click();
      // 7. Player hits the button to go home in the #game-over-dialog
      cy.get('#game-over-dialog').should('be.visible');
      cy.get('[data-cy=gameover-go-home]').click();
      cy.url().should('not.include', '/game');
      // 8. Player joins the new game created by the second user
      cy.get(`[data-cy-join-game=${newGameSummary.gameId}]`).should('be.enabled')
        .click();
      cy.url().should('include', `/lobby/${newGameSummary.gameId}`);
      // 9. Assert both players in lobby and both not ready
      cy.get('[data-cy=my-indicator]').contains(myUser.username);
      cy.get('[data-cy=opponent-indicator]').contains(opponentTwo.username);
      cy.get('[data-cy=my-indicator] [data-cy="lobby-card-container"]').should('not.have.class', 'ready');
      cy.get('[data-cy=opponent-indicator] [data-cy="lobby-card-container"]').should('not.have.class', 'ready');
    });
  });
});

describe('Lobby - Page Content (Ranked)', () => {
  beforeEach(() => {
    setup(true);
  });

  it('Displays ranked header', () => {
    checkRanked(true);
    cy.get('[data-cy=edit-game-ranked-switch]').should('exist');
  });

  it('Displays ranked button', () => {
    cy.get('[data-cy=ready-button-sword-cross-icon]').should('exist');
  });

  it('Changes games to ranked and casual from the lobby', () => {
    // Set To Casual Mode
    cy.toggleInput('[data-cy=edit-game-ranked-switch]', true);
    cy.contains('Game Mode changed to').should('exist');
    cy.get('[data-cy="close-snackbar"]').click();
    cy.contains('Game Mode changed to').should('not.exist');
    checkRanked(false);
    cy.get('[data-cy=ready-button-coffee-icon]').should('exist');

    // Set To Ranked Mode
    cy.toggleInput('[data-cy=edit-game-ranked-switch]');
    checkRanked(true);
    cy.get('[data-cy=ready-button-sword-cross-icon]').should('exist');
  });

  it('Changes games to ranked and casual on pressing Enter', () => {
    cy.get('[data-cy=edit-game-ranked-switch] input')
      .focus()
      .type('{enter}');
    // Set To Casual Mode
    cy.contains('Game Mode changed to').should('exist');
    cy.get('[data-cy="close-snackbar"]').click();
    cy.contains('Game Mode changed to').should('not.exist');
    checkRanked(false);
    cy.get('[data-cy=ready-button-coffee-icon]').should('exist');
    // Set To Ranked Mode
    cy.get('[data-cy=edit-game-ranked-switch] input')
      .focus()
      .type('{enter}');
    checkRanked(true);
    cy.get('[data-cy=ready-button-sword-cross-icon]').should('exist');
  });
});

describe('Lobby - P0 Perspective', () => {
  beforeEach(() => {
    setup();
  });

  it('Exits the Lobby', () => {
    cy.get('[data-cy=my-indicator]').contains(myUser.username);
    cy.get('[data-cy=exit-button]').click();
    // Confirm navigation back to home
    cy.location('pathname').should('eq', '/');
    // Test store state
    cy.window()
      .its('cuttle.gameStore')
      .then((state) => {
        expect(state.players.length).to.eq(0);
        expect(state.id).to.eq(null);
        expect(state.name).to.eq(null);
        expect(state.myPNum).to.eq(null);
      });
  });

  it('Ready & UnReady buttons work', () => {
    cy.get('[data-cy=ready-button]')
      // Test: Button text defaults to 'Ready'
      .contains('READY')
      .should('not.contain', 'UNREADY')
      .click()
      .contains('UNREADY');
    // Test: player indicator classes
    cy.get('[data-cy=my-indicator]').contains(myUser.username);

    cy.window()
      .its('cuttle.gameStore')
      .then((store) => {
        // Test: store state
        expect(store.p0Ready).to.eq(true); // Player is ready
        expect(store.opponentIsReady).to.eq(null); // Opponent is missing (not ready)
        // Click Unready button
        cy.get('[data-cy=ready-button]').click();
        cy.get('[data-cy=my-indicator]')
          .find('[data-cy="lobby-card-container"]')
          .should('not.have.class', 'ready');
        // Return updated store state
        return cy.wrap(store);
      })
      .then((updatedGameState) => {
        // Test updated store state
        expect(updatedGameState.p0Ready).to.eq(false); // Player not ready
      });
  });

  it('Shows when opponent joins, leaves, and re-joins', () => {
    cy.contains('[data-cy=opponent-indicator]', 'Invite');
    cy.window()
      .its('cuttle.gameStore')
      .then((gameData) => {
        cy.contains('[data-cy=opponent-indicator]', 'Invite');
        // Sign up new user and subscribe them to game
        cy.signupOpponent(opponentOne);
        cy.subscribeOpponent(gameData.id);
        // Test that opponent's username appears in indicator
        cy.contains('[data-cy=opponent-indicator]', opponentOne.username);
        // Opponent leaves
        cy.leaveLobbyOpponent(gameData.id);
        cy.contains('[data-cy=opponent-indicator]', 'Invite');
        // Opponent joins again
        cy.subscribeOpponent(gameData.id);
        cy.contains('[data-cy=opponent-indicator]', opponentOne.username);
      });
  });

  it('readying, leaving and joining back', () => {
    cy.window()
      .its('cuttle.gameStore')
      .then((gameData) => {
        cy.signupOpponent(opponentOne);
        const gameId = gameData.id;
        cy.subscribeOpponent(gameId);

        // Assert player and opponent indicators show correct usernames
        cy.get('[data-cy=my-indicator]').contains(myUser.username);
        cy.get('[data-cy=opponent-indicator]').contains(opponentOne.username);

        // player ready, exit, join back
        cy.get('[data-cy=ready-button]').click();
        cy.get('[data-cy=exit-button]').click();
        cy.get('[data-cy=game-list-item]').contains('button.v-btn', 'Join Casual')
          .click();
        cy.get('[data-cy=my-indicator]')
          .find('[data-cy="lobby-card-container"]')
          .should('not.have.class', 'ready');
        expect(gameData.p0Ready).to.eq(false);

        // Assert player and opponent indicators show correct usernames after rejoining
        cy.get('[data-cy=my-indicator]').contains(myUser.username);
        cy.get('[data-cy=opponent-indicator]').contains(opponentOne.username);

        // opponent ready, exit, join back
        cy.readyOpponent(gameId);
        cy.leaveLobbyOpponent(gameId);
        cy.get('[data-cy=opponent-indicator]').find('[data-cy="lobby-card-container"]')
          .should('not.exist');
        expect(gameData.p1Ready).to.eq(false);
        expect(gameData.opponentIsReady).to.eq(null);
        cy.subscribeOpponent(gameId);
        expect(gameData.p1Ready).to.eq(false);
        cy.get('[data-cy=opponent-indicator]').find('[data-cy="lobby-card-container"]')
          .should('exist');

        // Assert player and opponent indicators show correct usernames after opponent rejoins
        cy.get('[data-cy=my-indicator]').contains(myUser.username);
        cy.get('[data-cy=opponent-indicator]').contains(opponentOne.username);
      });
  });

  it('Shows when oppenent Readies/Unreadies', function () {
    // Opponent subscribes & readies up
    cy.signupOpponent(opponentOne);
    const { gameId } = this.gameSummary;
    cy.subscribeOpponent(gameId);
    cy.get('[data-cy=opponent-indicator]').find('[data-cy="lobby-card-container"]')
      .should('exist');
    cy.readyOpponent(gameId);
    cy.get('[data-cy=opponent-indicator]')
      .find('[data-cy="lobby-card-container"]')
      .should('have.class', 'ready');
    // Opponent un-readies
    cy.readyOpponent(gameId);
    cy.get('[data-cy=opponent-indicator]')
      .find('[data-cy="lobby-card-container"]')
      .should('not.have.class', 'ready');
  });

  it('Shows when opponent changes game to ranked or casual', function () {
    const { gameId } = this.gameSummary;
    // Opponent subscribes & Changes Mode
    cy.signupOpponent(opponentOne);
    cy.subscribeOpponent(gameId);

    checkRanked(false);
    cy.get('[data-cy=ready-button-coffee-icon]').should('exist');
    cy.setIsRankedOpponent(gameId, true);

    checkRanked(true);
    cy.get('[data-cy=ready-button-sword-cross-icon]').should('exist');

    cy.setIsRankedOpponent(gameId, false);
    checkRanked(false);
    cy.get('[data-cy=ready-button-coffee-icon]').should('exist');
  });

  it('Game starts when both players are ready - opponent first', function () {
    const { gameId } = this.gameSummary;
    cy.signupOpponent(opponentOne);

    cy.subscribeOpponent(gameId);
    cy.readyOpponent(gameId).then(() => {
      cy.get('[data-cy=ready-button]').click();
      assertGameStarted();
    });
  });

  it('Game starts when both players are ready - player first', function () {
    const { gameId } = this.gameSummary;
    cy.get('[data-cy=ready-button]').click();
    cy.signupOpponent(opponentOne);
    cy.subscribeOpponent(gameId);
    cy.readyOpponent(gameId).then(() => {
      assertGameStarted();
    });
  });

  describe('Reloading the lobby', () => {
    it('Reloads lobby data after page refresh when the game has not started', function () {
      const { gameId } = this.gameSummary;
      cy.reload();
      cy.url().should('include', '/lobby');
      cy.get('[data-cy=my-indicator]').contains(myUser.username);

      cy.signupOpponent(opponentOne);
      cy.subscribeOpponent(gameId);
      cy.get('[data-cy=opponent-indicator]').should('contain', opponentOne.username);
      cy.reload();

      cy.url().should('include', '/lobby');
      cy.get('[data-cy=my-indicator]').contains(myUser.username);
      cy.get('[data-cy=opponent-indicator]').should('contain', opponentOne.username);
      cy.readyOpponent(gameId);
      cy.get('[data-cy=opponent-indicator]').find('[data-cy="lobby-ready-card"]')
        .should('exist');

      cy.reload();
      cy.get('[data-cy=opponent-indicator]').find('[data-cy="lobby-ready-card"]')
        .should('exist');
      cy.get('[data-cy=my-indicator]').find('[data-cy="lobby-back-card"]')
        .should('exist');

      cy.get('[data-cy=ready-button]').click();
      assertGameStarted();
    });
  });

  it('Brings you into the game when readying after game has started', function () {
    const { gameId } = this.gameSummary;
    cy.get('[data-cy=my-indicator]').contains(myUser.username);
    cy.get('[data-cy=ready-button]').click();
    cy.signupOpponent(opponentOne);
    cy.subscribeOpponent(gameId);
    cy.get('[data-cy=opponent-indicator]').should('contain', opponentOne.username);

    cy.window()
      .its('cuttle.authStore')
      .then((store) => store.disconnectSocket());
    cy.readyOpponent(gameId);

    cy.window()
      .its('cuttle.authStore')
      .then((store) => store.reconnectSocket());

    cy.get('[data-cy=ready-button]').click();
    assertGameStarted();
  });
});

describe('Lobby - P1 Perspective', () => {
  beforeEach(() => {
    cy.wipeDatabase();
    cy.visit('/');
    cy.signupPlayer(myUser);
    window.localStorage.setItem('announcement', announcementData.id);
    cy.createGamePlayer({ gameName: 'Test Game', isRanked: false }).then((gameSummary) => {
      cy.wrap(gameSummary).as('gameSummary');
      // Sign up new (other) user and subscribe them to game
      cy.signupOpponent(opponentOne);
      cy.subscribeOpponent(gameSummary.gameId);
      // Join game as this user and navigate to lobby
      cy.window()
        .its('cuttle.gameStore')
        .then((store) => store.requestSubscribe(gameSummary.gameId));
      cy.vueRoute(`/lobby/${gameSummary.gameId}`);
    });
  });

  it('Shows opponent already in lobby for player joining second', () => {
    cy.contains('[data-cy=opponent-indicator]', opponentOne.username);
  });

  it('Shows when oppenent Readies/Unreadies', function () {
    const { gameId } = this.gameSummary;
    cy.contains('[data-cy=opponent-indicator]', opponentOne.username);
    cy.get('[data-cy=opponent-indicator]').find('[data-cy="lobby-card-container"]')
      .should('exist');
    cy.readyOpponent(gameId);
    cy.get('[data-cy=opponent-indicator]')
      .find('[data-cy="lobby-card-container"]', { timeOut: 10000 })
      .should('have.class', 'ready');
    cy.get('[data-cy=my-indicator]').find('[data-cy="lobby-card-container"]')
      .should('exist');
    // Opponent un-readies
    cy.readyOpponent(gameId);
    cy.get('[data-cy=opponent-indicator]')
      .find('[data-cy="lobby-card-container"]')
      .should('not.have.class', 'ready');
    cy.get('[data-cy=my-indicator]').find('[data-cy="lobby-card-container"]')
      .should('exist');
  });

  it('Shows when opponent leaves and rejoins', function () {
    const { gameId } = this.gameSummary;
    cy.contains('[data-cy=opponent-indicator]', opponentOne.username);
    cy.get('[data-cy=opponent-indicator]').find('[data-cy="lobby-card-container"]')
      .should('exist');
    cy.leaveLobbyOpponent(gameId); // Opponent leaves
    cy.contains('[data-cy=opponent-indicator]', 'Invite');
    cy.get('[data-cy=opponent-indicator]').find('[data-cy="lobby-card-container"]')
      .should('not.exist');
    // Opponent joins again
    cy.window()
      .its('cuttle.gameStore')
      .then((gameData) => {
        cy.subscribeOpponent(gameData.id);
      });

    cy.contains('[data-cy=opponent-indicator]', opponentOne.username);
    cy.get('[data-cy=opponent-indicator]')
      .find('[data-cy="lobby-card-container"]')
      .should('exist')
      .should('not.have.class', 'ready');
  });

  it('Ready & UnReady buttons work', () => {
    cy.get('[data-cy=ready-button]')
      // Test: Button text defaults to 'Ready'
      .contains('READY')
      .should('not.contain', 'UNREADY')
      .click()
      .contains('UNREADY');
    // Test: player indicator classes
    cy.get('[data-cy=my-indicator]').contains(myUser.username);
    cy.get('[data-cy=opponent-indicator]').find('[data-cy="lobby-card-container"]')
      .should('exist');
    cy.window()
      .its('cuttle.gameStore')
      .then((store) => {
        // Test: store state
        expect(store.p1Ready).to.eq(true); // Player is ready
        expect(store.opponentIsReady).to.eq(false); // Opponent is not ready
        // Click Unready button
        cy.get('[data-cy=ready-button]')
          .should('contain', 'UNREADY')
          .click()
          .should('not.contain', 'UNREADY')
          .should('contain', 'READY');
        cy.get('[data-cy=my-indicator]')
          .find('[data-cy="lobby-card-container"]')
          .should('not.have.class', 'ready');
        // Return updated store state
        return cy.wrap(store);
      })
      .then((updatedGameState) => {
        // Test updated store state
        expect(updatedGameState.p1Ready).to.eq(false); // Player not ready
      });
  });

  it('readying, exit, joining back', () => {
    cy.window()
      .its('cuttle.gameStore')
      .then((gameData) => {
        // player ready, exit, join back
        cy.get('[data-cy=ready-button]').click();
        cy.get('[data-cy=exit-button]').click();
        cy.get('[data-cy=game-list-item]').contains('button.v-btn', 'Join Casual')
          .click();
        cy.get('[data-cy=my-indicator]')
          .find('[data-cy="lobby-card-container"]')
          .should('not.have.class', 'ready');
        expect(gameData.p1Ready).to.equal(false);

        // opponent ready, exit, join back
        cy.readyOpponent(gameData.id);
        cy.leaveLobbyOpponent(gameData.id);
        cy.get('[data-cy=opponent-indicator]').find('[data-cy="lobby-card-container"]')
          .should('not.exist');
        expect(gameData.p0Ready).to.equal(false);
        cy.subscribeOpponent(gameData.id);
        expect(gameData.p0Ready).to.eq(false);
        cy.get('[data-cy=opponent-indicator]').find('[data-cy="lobby-card-container"]')
          .should('exist');
      });
  });

  it('Game starts when both players are ready - opponent ready before joining', function () {
    const { gameId } = this.gameSummary;
    cy.get('[data-cy=exit-button]').click(); // leave game so opponent can ready before player joins
    cy.readyOpponent(gameId);
    // Join game again
    cy.window()
      .its('cuttle.gameStore')
      .then((store) => store.requestSubscribe(this.gameSummary.gameId));
    cy.vueRoute(`/lobby/${this.gameSummary.gameId}`);
    cy.get('[data-cy=ready-button]').click();
    // Test that game started
    assertGameStarted();
  });

  it('Game starts when both players are ready - opponent readies first after player joins', function () {
    cy.readyOpponent(this.gameSummary.gameId);
    cy.get('[data-cy=ready-button]').click();
    assertGameStarted();
  });

  it('Game starts when both players are ready - player readies first', function () {
    cy.get('[data-cy=ready-button]').click();
    cy.readyOpponent(this.gameSummary.gameId);
    assertGameStarted();
  });

  it('Reloads lobby after page refresh and loads user into the game when game has already started with one move made', function () {
    cy.get('[data-cy=ready-button]').click();
    cy.get('[data-cy=my-indicator]').find('[data-cy="lobby-ready-card"]')
      .should('exist');

    cy.get('[data-cy=opponent-indicator]').should('contain', opponentOne.username);
    cy.get('[data-cy=opponent-indicator]').find('[data-cy="lobby-back-card"]')
      .should('exist');

    cy.reload();
    cy.get('[data-cy=my-indicator]').find('[data-cy="lobby-ready-card"]')
      .should('exist');
    cy.get('[data-cy=opponent-indicator]').should('contain', opponentOne.username);
    cy.get('[data-cy=opponent-indicator]').find('[data-cy="lobby-back-card"]')
      .should('exist');

    // Disconnect socket and then opponent hits ready to start game
    cy.window()
      .its('cuttle.authStore')
      .then((store) => store.disconnectSocket());
    cy.readyOpponent(this.gameSummary.gameId);

    cy.drawCardOpponent();

    // Reload the page -- should bring user into the game
    cy.reload();
    cy.get('[data-player-hand-card]').should('have.length', 6);
    cy.get('[data-opponent-hand-card]').should('have.length', 6);
    assertGameStarted(false); // skip hand size assertion
  });
});

describe('Lobby invite links', () => {
  beforeEach(() => {
    cy.wipeDatabase();
    cy.visit('/');
    cy.signupPlayer(myUser);
    cy.visit('/');
    window.localStorage.setItem('announcement', announcementData.id);
    cy.createGamePlayer({ gameName: 'Test Game', isRanked: false }).then((gameSummary) => {
      cy.wrap(gameSummary).as('gameSummary');
      // Sign up new (other) user and subscribe them to game
      cy.signupOpponent(opponentOne);
      cy.subscribeOpponent(gameSummary.gameId);
    });
  });

  it('Joins Lobby via invite link', function () {
    const { gameId } = this.gameSummary;
    cy.visit(`/lobby/${gameId}`);
    cy.get('[data-cy-ready-indicator=definitelyNotTheGovernment6969]').should('be.visible');
    cy.window()
      .its('cuttle.gameStore')
      .then((store) => expect(store.id).to.eq(gameId));
    cy.readyOpponent(gameId);
    cy.get('[data-cy=ready-button]').click();
    cy.get('[data-opponent-hand-card]').should('have.length', 5);
  });

  it('Redirects to login, then back to lobby when unauthenticated user visits invite link', function () {
    const { gameId } = this.gameSummary;
    cy.visit('/');
    cy.readyOpponent(gameId);
    cy.get('[data-cy=user-menu]').click();
    cy.get('[data-nav=\'Log Out\']').click();
    cy.visit(`/lobby/${gameId}`);
    cy.url().should('include', `/login/${gameId}`);
    cy.get('[data-cy=password]').type(myUser.password);
    cy.get('[data-cy=username]').type(myUser.username + '{enter}');
    cy.get('[data-cy-ready-indicator=definitelyNotTheGovernment6969]').should('be.visible');
    cy.window()
      .its('cuttle.gameStore')
      .then((store) => expect(store.id).to.eq(gameId));
    cy.get('[data-cy=lobby-card-container]').should('have.class', 'ready');
    cy.get('[data-cy=ready-button]').click();
    cy.get('[data-opponent-hand-card]').should('have.length', 5);
  });

  it('Joins Lobby from url and refreshes', function () {
    const { gameId } = this.gameSummary;
    cy.visit(`/lobby/${gameId}`);
    cy.get('[data-cy-ready-indicator=definitelyNotTheGovernment6969]').should('be.visible');
    cy.window()
      .its('cuttle.gameStore')
      .then((store) => expect(store.id).to.eq(gameId));
    cy.readyOpponent(gameId);
    cy.get('[data-cy=lobby-card-container]').should('have.class', 'ready');
    cy.reload();
    cy.get('[data-cy=lobby-card-container]').should('have.class', 'ready');
    cy.get('[data-cy=ready-button]').click();
    cy.get('[data-opponent-hand-card]').should('have.length', 5);
  });

  it('Navigates Home and shows error snackbar when user visits invalid invite link', function () {
    cy.visit('/lobby/100000');
    assertSnackbar(SnackBarError.CANT_FIND_GAME, 'error', 'newgame');
    cy.visit('/rules');
    cy.visit('/');
    cy.get(`[data-cy=newgame-snackbar] .v-snackbar__wrapper`).should('not.exist');
  });

  it('Navigates Home and shows error snackbar when user visits invite link of full game', function () {
    cy.get(`[data-cy-join-game=${this.gameSummary.gameId}]`).should('be.enabled');
    cy.signupOpponent(opponentTwo);
    cy.subscribeOpponent(this.gameSummary.gameId);
    cy.get(`[data-cy-join-game=${this.gameSummary.gameId}]`).should('be.disabled');
    cy.visit(`/lobby/${this.gameSummary.gameId}`);
    assertSnackbar(SnackBarError.GAME_IS_FULL, 'error', 'newgame');
  });
});

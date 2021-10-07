import { Grid } from '@material-ui/core';
import React, { useEffect, useState } from 'react';
import { useTypeSelector } from 'core/hooks/useTypeSelector';
import { PlayingGameCard } from 'core/components/gameCard/PlayingGameCard';
import { useDispatch } from 'react-redux';
import { IssueVote } from 'core/types/issueVotesType';
import { setIssueVote, setIssueVoteResult } from 'store/actionCreators/issueVote';
import { socket } from 'core/api/socket.service';
import { postNewIssueVote } from 'core/api/issueVote.service';
import { ITimerMsg, IVoteIssueMsg, Message } from 'core/types/socketMessageType';
import { Roles } from 'core/types/roleType';

interface CardFieldProps {
  chooseIssueId: string;
  timerValue: number;
}

export const CardField: React.FC<CardFieldProps> = ({ chooseIssueId, timerValue }) => {
  const { gameSettings } = useTypeSelector(store => store.gameInfo.gameInfo);
  const { currentUser } = useTypeSelector(state => state.currentUser);
  const { issueVote } = useTypeSelector(state => state.issueVote);
  const [isClick, setIsClickValue] = useState(false);
  const dispatch = useDispatch();
  const { gameId } = currentUser;
  let issueVoteCard: IssueVote;

  const handleClickCard = (key?: string, value?: string) => {
    const defCard = gameSettings.cardValues[0];
    issueVoteCard = {
      vote: {
        key: `${key ? key : defCard.key}`,
        value: `${value ? value : defCard.value}`,
      },
      gameId: `${currentUser.gameId}`,
      playerId: `${currentUser.userId}`,
      issueId: `${chooseIssueId}`,
    };
    dispatch(setIssueVote(issueVoteCard));
    postNewIssueVote(issueVoteCard);
    setIsClickValue(false);
  };

  useEffect(() => {
    const socketAddVoteByIssueMsg = (msg: IVoteIssueMsg) => {
      dispatch(setIssueVoteResult(msg.payload));
    };
    socket.on('addVoteByIssueMsg', socketAddVoteByIssueMsg);
    return () => {
      socket.off('addVoteByIssueMsg', socketAddVoteByIssueMsg);
    };
  }, []);

  useEffect(() => {
    if (timerValue === 0 && isClick && currentUser.role !== Roles.observer) {
      if (
        (currentUser.role === Roles.creator && gameSettings.isAsPlayer) ||
        currentUser.role === Roles.user
      )
        handleClickCard();
    }
  }, [timerValue]);

  useEffect(() => {
    const handleClickCardValue = (msg: ITimerMsg) => {
      if (msg.payload === `start-${gameId}`) {
        setIsClickValue(true);
      } else if (msg.payload === `restart-${gameId}`) {
        setIsClickValue(true);
      } else if (
        msg.payload === `end-${gameId}` &&
        !gameSettings.isTimer &&
        isClick &&
        (gameSettings.isAsPlayer || currentUser.role === Roles.user) &&
        currentUser.role !== Roles.observer
      ) {
        handleClickCard();
      } else if (
        msg.payload === `end-${gameId}` &&
        issueVote.vote.value === '' &&
        (gameSettings.isAsPlayer || currentUser.role === Roles.user) &&
        currentUser.role !== Roles.observer
      ) {
        handleClickCard();
      }
    };
    socket.on(Message.startRound, handleClickCardValue);
    socket.on(Message.restartRound, handleClickCardValue);
    socket.on(Message.endRound, handleClickCardValue);
    return () => {
      socket.off(Message.startRound, handleClickCardValue);
      socket.off(Message.restartRound, handleClickCardValue);
      socket.off(Message.endRound, handleClickCardValue);
    };
  }, [isClick && chooseIssueId]);

  return (
    <Grid container>
      {(gameSettings.isAsPlayer && currentUser.role === Roles.creator) ||
      currentUser.role === Roles.user
        ? gameSettings.cardValues.map(elem => {
            return (
              <Grid item xs md key={elem.key}>
                <PlayingGameCard
                  type={gameSettings.shortScoreType}
                  value={elem.value}
                  keyCard={elem.key}
                  isClick={isClick}
                  onClick={handleClickCard}
                />
              </Grid>
            );
          })
        : null}
    </Grid>
  );
};

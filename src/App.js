import React from 'react';
import './App.css';
import './widthme.css';
import { Route, useParams } from 'react-router-dom';
import { Switch} from 'react-router-dom';
import { useHistory } from "react-router-dom";
import { useState , useEffect, useRef} from 'react';
import * as firebase from 'firebase/app';
import "firebase/analytics";
import "firebase/firestore";
import ReactTooltip from "react-tooltip";
import { Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';


function App() {
  const firebaseConfig = {
    apiKey: "AIzaSyA18j7NY0km_kcU5CSQd53ZvfDdf5LMju8",
    authDomain: "yahtzee-online.firebaseapp.com",
    databaseURL: "https://yahtzee-online.firebaseio.com",
    projectId: "yahtzee-online",
    storageBucket: "yahtzee-online.appspot.com",
    messagingSenderId: "919294010950",
    appId: "1:919294010950:web:30ce5246287ab12ab8cc47",
    measurementId: "G-2KYBJWTQC5"
  };
  firebase.initializeApp(firebaseConfig);
  return (
      <Switch>
        <Route path = "/:roomId">
          <GamePage />
        </Route>
        <Route path = "/">
          <EnterRoomIdPage />
        </Route>
      </Switch>
  );
}

//==============================================================================
//                              Enter Room ID Page
//==============================================================================

function EnterRoomIdPage() {
  return (
    <div className ="container h-100">
      <div className="row justify-content-center h-100 align-items-center">
        <div className="col-md-auto">
        <div className="row mb-5 justify-content-center">
            <div className="col-5">
              <img className="w-100" src="yahtzee-logo.png" alt="logo"/>
            </div>
          </div>
          <div className="row mb-5 justify-content-center">
            <div className="col-auto">
              <CreateRoomButton />
            </div>
          </div>
          <div className="group mb-4">
                <div className="item line"></div>
                <div className="item text">OR</div>
                <div className="item line"></div>
              </div>
          <div className="row centre-text justify-content-center">
            <div className="col-auto">
                <JoinRoomIDForm />
            </div>
        </div>
      </div>
    </div>
  </div>
  );
}

function CreateRoomButton()  {
  let history = useHistory();
  

  function handleClick(event) {
    const roomId = addNewRoom();
    moveToRoom(roomId,history);
    event.preventDefault();
  }

  return (
    <button className="btn btn-primary"onClick={handleClick}>
        Create Game
    </button>
  );
}

function JoinRoomIDForm() {
  const [roomId, setRoomid] = useState('');
  const [alert,setAlert] = useState(false);
  let history = useHistory();

  function handleChange(event) {
    setRoomid(event.target.value)
  }

  function handleSubmit(event) {
    roomExists(roomId).then(exists => {if (exists) {
      moveToRoom(roomId,history);
    } else {
      setAlert(true);
    }});
    event.preventDefault();
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
      <label for="enterRoomCode">
        Game ID:
        </label>
      <input type="text" id="enterRoomCode" className="form-control" value={roomId} onChange={handleChange} placeholder="Enter a game ID" />
      </div>
      <button type="submit" className="btn btn-primary mb-3" disabled={!roomId}>Join Game</button>
      {alert ? <WrongCodeAlert setAlert={setAlert}/>:null}
    </form>
  );
  
}

//Alert displayed if an incorrect room ID is displayed
function WrongCodeAlert(props){
  return (
  <div className="alert alert-warning alert-dismissible fade show" role="alert">
    <strong>Invalid Room ID</strong> 
    <button type="button" className="close"  aria-label="Close" onClick={(event)=>{props.setAlert(false); event.preventDefault();}}>
      <span aria-hidden="true">&times;</span>
    </button>
  </div>
  );
}

//Navigate to new room
function moveToRoom(roomId, history) {
  sessionStorage.setItem('roomId',roomId);
  history.push("/"+ roomId);
}

//Generate a random ID, check there isn't already an instance of it and if not create a new room with that ID
function addNewRoom() {
  //Can just create a new db everytime I need one as it just returns a singleton object, the same one every time
  const db = firebase.firestore();
  const roomId = getRoomId();
  db.collection("rooms").doc(roomId).set({ 
    diceValues: ["","","","",""],
    turn: ""
  });
  return roomId;
}

//Generate a new unique room ID
function getRoomId() {
  const roomId = makeId();
  roomExists(roomId).then(exists => {if(exists) {
      getRoomId();
    } else {
      return roomId;
    }
  });
  return roomId;
}

//Generate a new random ID of 6 letters long
function makeId() {
  var length = 6;
  var result           = '';
  var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  var charactersLength = characters.length;
  for ( var i = 0; i < length; i++ ) {
     result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

//Checks if a room with the given ID exists
function roomExists(roomId){
  var db = firebase.firestore();
  return db.collection("rooms").doc(roomId).get().then(function(doc) {
    return doc.exists;
  });
}

//==============================================================================
//                              Game Page
//==============================================================================
//This section is everything that happens at the /{roomID} URL
//THere are two main sections though the first one is much smaller than the second
//Enter Name sub page: which either allows a user to enter their name, redirects them to the / URL or loads the game
//Game sub page: which actually has the game on it

function GamePage() {
  const {roomId} = useParams();
  const db = firebase.firestore();
  let history = useHistory();

  //Assume the user ID is for a different room so it loads the Enter Name page before the Game page by default as the other way round is messy
  const [userIdExistsButWrongRoom, setUserIdExistsButWrongRoom] = useState(true);
  const userId = sessionStorage.getItem('userId');

  //Checks everytime a state is updated, if the user ID is still for the wrong room
  //This is mainly used to redirect when you first land on the page if you have the correct room ID but has to be in a useEffect loop as you have to wait for the promise to resolve which can't happen before the first render
  useEffect(() => {
    if(!(userId===null)){
    db.collection("users").doc(userId).get().then(function(doc){
      if(doc.data().roomId === roomId){
          setUserIdExistsButWrongRoom(false);
        } 
      });
    }
  }, [db,roomId,userId]);

  //Checks you have been at least intially directed here by the first page (guaranteeing that a room has been created in the database)
  if(sessionStorage.getItem('roomId')===roomId){
    //Checks if the user ID has been set yet
    //If it is undefined then it hasn't been so go to Enter Name
    if(userId===null){
      return (
       
        <EnterName setUserIdExistsButWrongRoom = {setUserIdExistsButWrongRoom}/>
      
      );
    } else {
      //If there is a user ID set but it is for a different room then you need to generate a new user
        if(userIdExistsButWrongRoom){
          return (
            
            <EnterName setUserIdExistsButWrongRoom = {setUserIdExistsButWrongRoom}/>
          
          );
        } else {
          //If the correct Room is set and a user ID that corresponds to that room is set
          return (
            
            <Game />
            );
        }
      }
  } else {
    history.push("/");
    return (<div />);
  }
}

//==============================Enter Name=============================================
//This is just the code for entering the name and redirecting users that shouldn't be here

function EnterName(props) {
  const {roomId} = useParams();
  const [name, setName] = useState("");
  const db = firebase.firestore();
  const [alert,setAlert] = useState(false);

  function handleChange(event) {
    setName(event.target.value);
  }
  //Triggered when the form is submitted
  function handleSubmit(event) {
    //This prevents users joining games that have already started
    db.collection("rooms").doc(roomId).get().then((doc)=>{
      if(doc.data().turn ===""){
        addNewUser(roomId,name).then(function(user) {
          sessionStorage.setItem('userId',user.id);
    
          //Updates the state to reflect the new user ID belonging to the correct room
          props.setUserIdExistsButWrongRoom(false);
        });
      } else {
        setAlert(true);
      }
    })
    
    //IMPORTANT without preventing the default setting a confusing bug occurs where the page reloads before the promise resolves
    event.preventDefault();
    return false;
  }
  return (
    <div className ="container h-100">
      <div className="row justify-content-center h-100 align-items-center centre-text">
        <div className="col-md-auto">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
            <label>
              Name:
              </label>
              <input type="text" className="form-control"value={name} onChange={handleChange} />
              </div>
            <button type="submit" disabled={!name} className="btn btn-primary  mb-3">Submit</button>
          </form>
          {alert ? <GameStartedAlert setAlert={setAlert}/>:null}
        </div>
      </div>
     </div>
  );
}

//Alert displayed if an incorrect room ID is displayed
function GameStartedAlert(props){
  return (
  <div className="alert alert-warning alert-dismissible fade show" role="alert">
    <strong>Game already started</strong> 
    <button type="button" className="close"  aria-label="Close" onClick={(event)=>{props.setAlert(false); event.preventDefault();}}>
      <span aria-hidden="true">&times;</span>
    </button>
  </div>
  );
}

//Add a new user with server generated unique ID, and the given room ID to the database
//Returns the doc
function addNewUser(roomId,name) {
  const db = firebase.firestore();
  return db.collection("users").add({
    roomId: roomId,
    name: name,
    score:{
      addOnly: ["-","-","-","-","-","-"],
      threeOfAKind: ["-"],
      fourOfAKind: ["-"],
      fullHouse:["-"],
      smallStraight:["-"],
      largeStraight:["-"],
      yahtzee: ["-"],
      chance: ["-"],
      bonusYahtzee: ["-"]
    }
  });
  
}

//=================================Game=======================================
//Below here is all the code that actually runs the game

function Game() {
  var db = firebase.firestore();

  //Could create a room state which is an object that has all the room states inside it - would make passing to other components neater
  //Declare all the states used in the game
  const {roomId} = useParams();
  const userId = sessionStorage.getItem("userId");
  const [users,setUsers] = useState([]);
  const [turn, setTurn] = useState("");
  const [diceValues, setDiceValues] = useState(["","","","",""]);
  const [numOfRolls, setNumOfRolls] = useState(sessionStorage.getItem("numOfRolls")||0);
  const [diceToBeKept, setDiceToBeKept] = useState([false,false,false,false,false]);

  const gameStateObject = {
    turn: turn,
    diceValues: diceValues,
    numOfRolls: numOfRolls,
    users: users,
    userId: userId
   };

  //This essentially describes whether the user should be able to click roll
  const canRoll = turn === userId && numOfRolls < 3;

  //Describes if the user should see start game or roll buttons
  const showRoll = turn !== "";

  //Update the user state every time a new user is added, and update the dicevalues and turn state whenever another player rolls or ends their turn
  useEffect( () => {
    db.collection("users").where("roomId","==",roomId).onSnapshot( function(querySnapshot){
      setUsers(Object.fromEntries(querySnapshot.docs.map((user) => { 
        return [user.id ,user.data()]; })));
    });
    db.collection("rooms").doc(roomId).onSnapshot( function(doc){
        setDiceValues(doc.data().diceValues);
        setTurn(doc.data().turn);
    });
  },[roomId,db]);

  //Update the locally stored number of rolls everytime the state is updated
  useEffect(() =>{
    sessionStorage.setItem("numOfRolls",numOfRolls);
  },[numOfRolls]);
  
  //Update the database stored score everytime the local user score state is updated
  useEffect(()=>{
    const user = users[userId];
    //This condition is necessary to prevent it updating the database on initlisation
    // before the local state has been loaded from the database
    if(users.length !== 0){
      db.collection("users").doc(userId).update({ 
        score: user.score
    });
    }
  },[db,users,userId]);

  //Updates the database turn state, doesn't need to update the local 
  //turn state as that is updated by the onSnapshot function once the database has been updated
  function setNextTurn(nextUser) {
    db.collection("rooms").doc(roomId).update({
      turn: nextUser
    })
  }

  //Rolls only the dice not set to be kept
  function rollDice(event) {
    const randomRoll = Array.from({length: 5}, () => Math.floor(Math.random() * 6));
    //Update the dice values stored in database - the dice values local state will be updated by the onsnapshot function once this update is finished
    db.collection("rooms").doc(roomId).update({
      diceValues: diceValues.map((item, index) => 
      diceToBeKept[index]
      ? item
      : randomRoll[index]  ),
    });

    //Increment the number of rolls
    setNumOfRolls(n => parseFloat(n) + 1);
    event.preventDefault();
  }
  
  //Sets up for next users turn
  function endTurn() {

    //Picks the next user whose turn it will be
    Object.entries(users).forEach( ([id,userData], index) =>{
      if(id === userId){
        if(index < Object.keys(users).length-1){
          setNextTurn(Object.keys(users)[index +1]);
        } else {
          setNextTurn(Object.keys(users)[0]);
        }
      }
    });

    //Resets the local states for when it comes back round to your turn
    setNumOfRolls(0);
    setDiceToBeKept([false,false,false,false,false]);

    //Reset the dice so the next player doesn't start with the dice you finished with
    db.collection("rooms").doc(roomId).update({
      diceValues: diceValues.map((item, index) => 
      "" ),
    });
  }

  function startGame(){
    setNextTurn(Object.keys(users)[Math.floor(Math.random() * Object.keys(users).length)]);
    setNumOfRolls(0);
  }

  return (<div className="container centre-text h-100">
    <h1 className="roomIdTitle">
    Game ID: {roomId}
    </h1>
    <div className="container h-25 mb-4">
      <Dice {... gameStateObject} diceToBeKept={diceToBeKept} setDiceToBeKept={setDiceToBeKept}/>
      <div className="row h-25">
          <div className="col">
        <StartGameButton showRoll={showRoll} startGame={startGame}/>
        <RollButton showRoll={showRoll} rollDice={rollDice} canRoll={canRoll}/>
        </div>
      </div>
    </div>
    <ScoreSheet  {... gameStateObject} setUsers={setUsers} endTurn={endTurn} />
    <Rules />
  </div>);
}

//Button which when clicked sets a random player to take the first turn
function StartGameButton(props){

  function handleClick(e) {
    props.startGame();
    e.preventDefault(true);
  }
  return (
    <button className={"btn btn-primary mt-3 " + (props.showRoll ? "hidden" : "")} onClick={handleClick} disabled={props.showRoll}>Start Game</button>
  )
}

//Button which when clicked rolls the dice
function RollButton(props) {
  return(
    <button className={"btn btn-primary mt-3 " + (props.showRoll ? "" : "hidden")} onClick = {props.rollDice} disabled={!props.canRoll}>Roll</button>
  );
}



//Component containing all the dice - main function is to iteratively create Die
function Dice(props){
  //diceContainer is used to get the dimensions of the area the dice can roll in
  const diceContainer = useRef(null);

  //This essentially describes whether the user should be able to click roll
  const canRoll = props.turn === props.userId && props.numOfRolls < 3;

  //Position of dice when they are being kept
  const keep = {
    position: 'relative',
    top: 0,
    left:0,
    transform: 'rotate(0deg)'
  };

  //These are the initalised states of the Die where they are resting at the positiions given by bootstrap
  const [styles,setStyles] = useState([keep,keep,keep,keep,keep]);

  //This is called everytime the local dicevalues are updated, 
  //and it sets the css positions of the dice to look like they where thrown
  useEffect(() =>{
    const [top,left] = randomCoordinates(diceContainer);

    //This takes the random coordinates, adds a random giggle and rotations
    //This means that the dice will never touch each other as they are all at least 60px apart
    //and we are only giving a 15px jiggle
    setStyles(styles => styles.map((style,index)=> {return {
      position: 'absolute',
      top: top[index] + Math.random()*15,
      left: left[index] + Math.random()*15,
      transform: 'rotate(' + Math.random()*360 + 'deg)'
    }
  }));
  },[props.diceValues]);

  //The odd checking of number of rolls to "keep" the dice is to ensure they don't get thrown whilst the turn is changing
    return (
    
    <div ref={diceContainer} className="row h-75 align-items-end justify-content-center">
      {props.diceValues.map((value, index) => {
        return (
          <div className="col-auto dieContainer" style={(props.diceToBeKept[index])||!canRoll || (props.numOfRolls === 3) || (props.numOfRolls === 0)? keep: styles[index] }>
        <Die key={"Dice" + index} index={index} value={value} setDiceToBeKept={props.setDiceToBeKept}/>
        </div>
        );
      })}
    </div>
    
  );
}

//This generates a random set of unique coordinates with every 
//coordianate at least 60px apart from the others
function randomCoordinates(diceContainer) {
    const topOfContainer = diceContainer.current.getBoundingClientRect().top;
    const leftOfContainer = diceContainer.current.getBoundingClientRect().left;
    const widthOfContainer = diceContainer.current.getBoundingClientRect().width;
    const heightOfContainer = diceContainer.current.getBoundingClientRect().height;

    const yCoordinates = Array.from({length: 5}, () => Math.floor(Math.random() * (heightOfContainer/60-1)));
    let xCoordinates =[];
    for( let outerIndex = 0; outerIndex < yCoordinates.length; outerIndex++ ){
      let notUnique = true;
      while(notUnique){
        const newX = Math.floor(Math.random() * (widthOfContainer/60-1));
        if(xCoordinates.every((x,innerIndex)=>{
          return !((newX === x) && (yCoordinates[outerIndex] === yCoordinates[innerIndex]))
        })){
          notUnique = false;
          xCoordinates.push(newX);
        }
      }
    }

    return [yCoordinates.map(y=>y*60+topOfContainer),xCoordinates.map(y=>y*60+leftOfContainer)]
}

//Displays Die and also manages calls to set which dice to be kept
function Die(props){
  var _dice = ['https://upload.wikimedia.org/wikipedia/commons/1/1b/Dice-1-b.svg',
             'https://upload.wikimedia.org/wikipedia/commons/5/5f/Dice-2-b.svg',
             'https://upload.wikimedia.org/wikipedia/commons/b/b1/Dice-3-b.svg',
             'https://upload.wikimedia.org/wikipedia/commons/f/fd/Dice-4-b.svg',
             'https://upload.wikimedia.org/wikipedia/commons/0/08/Dice-5-b.svg',
             'https://upload.wikimedia.org/wikipedia/commons/2/26/Dice-6-b.svg'];
  

  //Code here sets the die position either to "keep" or the thrown state, it also changes the state on click which 
  //when rerendered changes the position
  return(
       <img  className = {props.value === "" ? "dieImg hidden" : "dieImg"} src={_dice[props.value]} alt = {props.value} onClick={(e) => {props.setDiceToBeKept(diceToBeKept => diceToBeKept.map((item, index) => 
        index === props.index
        ? !item
        : item ))}}/>
    
  );
}

//Component displaying scoresheet
function ScoreSheet(props) {

  const {users, ...scoreStateObject} = props;
  //TODO: possibly figure out if game is over by querying database for "-" instead of doing it in child component, could also calculate final totals by using database queries in the Winners component
  //Proabably neater though also slower

  const [gameOver, setGameOver] = useState(Boolean(Object.keys(props.users).length));


  let totals =[];
  function pushTotal([name,total]){
    totals.push([name,total]);
  }
  useEffect(()=>{
    setGameOver(Boolean(Object.keys(props.users).length));
  },[props.users]);

  return (
    <table className="table table-sm w-md-50 w-lg-50 w-xl-50 mx-auto">
    <ReactTooltip place="top" />
    <tr>
      <td>
        Name
      </td>
      <td data-tip="Add all the ones">
        Add only Aces
      </td>
      <td data-tip="Add all the twos">
        Add only Twos
      </td>
      <td data-tip="Add all the threes">
        Add only Threes
      </td>
      <td data-tip="Add all the fours">
        Add only Fours
      </td>
      <td data-tip="Add all the fives">
        Add only Fives
      </td>
      <td data-tip="Add all the sixes">
        Add only Sixes
      </td>
      <td  data-tip="Add all 5 dice">
        Three Of A Kind
      </td>
      <td data-tip="Add all 5 dice">
        Four Of A Kind
      </td>
      <td data-tip="Three of a kind + a pair: 25 points">
        Full House
      </td>
      <td data-tip="4 dice long straight: 30 points">
        Small Straight
      </td>
      <td data-tip="5 dice long straight: 40 points">
        Large Straight
      </td>
      <td data-tip="Five of a kind: 50 points">
        Yahtzee
      </td>
      <td data-tip="Add all 5 dice on any roll">
        Chance
      </td>
      <td data-tip="Five of a kind for the second time: 100 points">
        Bonus Yahtzee
      </td>
      <td>
        <b>
        Total
        </b>
      </td>
    </tr>
    {Object.entries(props.users).map((user) => {
      return (
    <ScoreColumn pushTotal={pushTotal} setGameOver={setGameOver} user={user} {...scoreStateObject}/>
   
    );
  })}
  {gameOver ? (<Winners users={props.users} totals={totals}/>):null}
</table>

  );
}


//Displays each users score in a column of the score sheet - also registers the changes in score at the end of each round
function ScoreColumn(props) {
  const setOrder = ["addOnly","threeOfAKind","fourOfAKind","fullHouse","smallStraight","largeStraight","yahtzee","chance","bonusYahtzee"];
  //Evaluates if the score sheet should be allowing the user to choose how to score their dice
  const pickScore = props.turn === props.userId && props.numOfRolls >= 3;
  let total=0;
  
  //Edit the user local state to reflect the newly calculated score
  function addScore(key,index) {
   props.setUsers(users => Object.fromEntries(Object.entries(users).map(([id,user])=>{
    if(id === props.user[0]) {
      return [id,Object.fromEntries(Object.entries(user).map(([entryKey,entryValue]) => {
        if(entryKey === "score") {
          return ["score", Object.fromEntries(Object.entries(entryValue).map(([scoreKey,scoreValue]) => {
              if(scoreKey===key) {
                return [scoreKey, calculateScore(scoreValue,key,index)];
              } else {
                return [scoreKey,scoreValue]
              }
          }))]
          } else {
            return [entryKey,entryValue]
          }
      }))]}
     else { 
      return [id,user];
    }}))
   );
  }

  //Calculate the new score depending on which row of the table was clicked
  function calculateScore(currentScore,key,index) {
    switch(key) {
      case 'addOnly':
        return currentScore.map((value,i)=> i === index ? props.diceValues.reduce(sumAddOnly,0): value);
      case 'threeOfAKind':
        return threeOfAKind() ? [props.diceValues.reduce((total,v)=>total + v + 1)]: [0];
      case 'fourOfAKind':
        return fourOfAKind() ? [props.diceValues.reduce((total,v)=>total + v + 1)]: [0];
      case 'fullHouse':
        return fullHouse() ? [25] :[0];
      case 'smallStraight':
        return smallStraight() ? [30] : [0];
      case 'largeStraight':
        return largeStraight() ? [40] : [0];
      case 'chance':
        return [props.diceValues.reduce((total,v)=>total + v + 1)];
      case 'yahtzee':
        return yahtzee() ? [50]:[0];
      case 'bonusYahtzee':
        return bonusYahtzee() ? [100] :[0];
      default:
        alert("Error calculating score");
        return 0;
    }

    //Reduce function for the add only - sums the values that are equal to the passed index
    function sumAddOnly(total, currentValue,j,originalScores) {
      if(originalScores[j] === index) {
        return total + originalScores[j] + 1;
      } else {
        return total;
      }
    }
    
    //Evaluates whether or not a three of a kind is present
    function threeOfAKind() {
      return props.diceValues.some((dieValue)=>{
        if(props.diceValues.reduce((total,cur,index,src)=>(
          src[index]  === dieValue ? total +1:total
        ),0)>=3){
          return true;
        } else {
          return false;
        }
      });
    }

    //Evaluates whether or not a four of a kind is present
    function fourOfAKind() {
      return props.diceValues.some((dieValue)=>{
        if(props.diceValues.reduce((total,cur,index,src)=>(
          src[index] === dieValue ? total +1:total
        ),0)>=4){
          return true;
        } else {
          return false;
        }
      });
    }

    //Evaluates whether or not a full house is present
    function fullHouse() {
      return props.diceValues.some((dieValue)=>{
        if(props.diceValues.reduce((total,cur,index,src)=>(
          src[index] === dieValue ? total +1:total
        ),0)>=3){
          const possiblePair = props.diceValues.filter((element)=>{
            return element !== dieValue
          });
          if(possiblePair[0]===possiblePair[1]){
            return true;
          } else {
            return false;
          }
        } else {
          return false;
        }
      });
    }

    //Evaluates whether or not a small straight is present
    function smallStraight() {
      if([0,1,2,3].every(element => props.diceValues.includes(element))){
        return true;
      }
      else if([1,2,3,4].every(element => props.diceValues.includes(element))){
        return true;
      }
      else if([2,3,4,5].every(element => props.diceValues.includes(element))){
        return true;
      }else {
      return false;
      }
    }

    //Evaluates whether or not a large straight is present
    function largeStraight() {
      const sorted = props.diceValues.sort();
      if(JSON.stringify(sorted) ===JSON.stringify([0,1,2,3,4])){
        return true;
      } 
      if(JSON.stringify(sorted)===JSON.stringify([1,2,3,4,5])){
        return true;
      }
      return false;
    }

    //Evaluates whether or not a yahtzee is present
    function yahtzee() {
      return props.diceValues.some((dieValue)=>{
        if(props.diceValues.reduce((total,cur,index,src)=>(
          src[index]  === dieValue ? total +1:total),0)>=5){
          return true;
        } else {
          return false;
        }
      });
    }
    
    //Can only be called if yahtzee has already been rolled
    function bonusYahtzee() {
      
        return yahtzee();
      
    }
  }
  

  //Does all the complicated business of making sure the correct score is displayed for each column, making them clickable etc.
  return (
<tr>
<td className = {props.user[0]===props.turn ? "yourTurn" : ""}>
  <b>
{props.user[1].name}
</b>
</td>
{ Object.entries(props.user[1].score).sort(function([a,c], [b,d]){  
  return setOrder.indexOf(a) - setOrder.indexOf(b);
}).map(([key,value])=>{
  return value.map( (innerValue,index) => {
    if(innerValue !== "-"){
      total = total + innerValue;
    } else {
      if(key !== "bonusYahtzee"){
        props.setGameOver(false);
      }
    }
    if(key ==="bonusYahtzee"){
      props.pushTotal([props.user[1].name, total])
    }
    
    return (
      <td className={(innerValue ==="-" && props.user[0]===props.userId && pickScore && key !=="bonusYahtzee") || (innerValue ==="-" && props.user[0]===props.userId && pickScore && key ==="bonusYahtzee" && props.user[1].score.yahtzee[0]===50)? "clickable" : ""} onClick = {(event)=>{
      if((innerValue ==="-" && props.user[0]===props.userId && pickScore && key !=="bonusYahtzee") || (innerValue ==="-" && props.user[0]===props.userId && pickScore && key ==="bonusYahtzee" && props.user[1].score.yahtzee[0]===50)){
        addScore(key,index);
        props.endTurn();
        
      }}}>
          {(innerValue ==="-" && props.user[0]===props.userId && pickScore && key !=="bonusYahtzee") || (innerValue ==="-" && props.user[0]===props.userId && pickScore && key ==="bonusYahtzee" && props.user[1].score.yahtzee[0]===50) ? calculateScore(value,key,index)[index] :innerValue}
      </td>
      
    );
})
})
}
<td>
  {total}
</td>
</tr>
  );
}



function Winners(props) {
  const [modal, setModal] = useState(true);

  const toggle = () => setModal(!modal);

   return(
    <Modal isOpen={modal} toggle={toggle} backdrop="static" >
        <ModalHeader toggle={toggle}>Game Over</ModalHeader>
        <ModalBody>

         And the winner is .... {props.totals.reduce((a, b) => Object.fromEntries(props.totals)[a[0]] > Object.fromEntries(props.totals)[b[0]] ? a : b)[0]}     </ModalBody>
        <ModalFooter>
          
        </ModalFooter>
      </Modal>
  );
}

function Rules() {
  const [modal, setModal] = useState(true);

  const toggle = () => setModal(!modal);
  var _dice = ['https://upload.wikimedia.org/wikipedia/commons/1/1b/Dice-1-b.svg',
  'https://upload.wikimedia.org/wikipedia/commons/5/5f/Dice-2-b.svg',
  'https://upload.wikimedia.org/wikipedia/commons/b/b1/Dice-3-b.svg',
  'https://upload.wikimedia.org/wikipedia/commons/f/fd/Dice-4-b.svg',
  'https://upload.wikimedia.org/wikipedia/commons/0/08/Dice-5-b.svg',
  'https://upload.wikimedia.org/wikipedia/commons/2/26/Dice-6-b.svg'];


   return(
    <Modal isOpen={modal} toggle={toggle} >
        <ModalHeader toggle={toggle}>How to Play</ModalHeader>
        <ModalBody>
          <p>On your turn, you roll 5 dice. You can then reroll any combination of these dice twice more in an attempt to get the best possible scoring combination.
            You select which dice to keep by clicking (or tapping) on them to place them in your scoring row. 
            <br></br>
            <br></br>
            At the end of your turn, you must choose how to score your dice, as each combination may be scored in a variety of ways. e.g.  </p> 
            <img  className = {"dieImg mr-2" } src={_dice[0]} alt = "0" ></img>
            <img  className = {"dieImg mr-2" } src={_dice[0]} alt = "0" ></img>
            <img  className = {"dieImg mr-2" } src={_dice[0]} alt = "0" ></img>
            <img  className = {"dieImg mr-2" } src={_dice[4]} alt = "0" ></img>
            <img  className = {"dieImg " } src={_dice[4]} alt = "0" ></img>
            <p>could be scored in the following ways:
            <ul>
              <li>Add only Aces = 1 + 1 +1 = 3 points</li>
              <li>Add only Fives = 5 + 5 = 10 points</li>
              <li>Three of a Kind = 1 + 1 + 1 + 5 + 5 = 13 points</li>
              <li>Full House = 25 points</li>
            </ul>
            You have to score your dice every round and you can score in each category only once.
            This means that towards the end of the game, you will likely find that you can only score 0 in the remaining categories, so choose how to score carefully.
            </p>
          
           </ModalBody>
        <ModalFooter>
          <button className="btn btn-primary" onClick={toggle}>Let's Play</button>
        </ModalFooter>
      </Modal>
  );
}

export default App;

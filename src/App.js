import React from 'react';
import './App.css';
import './widthme.css';
import { Route, useParams } from 'react-router-dom';
import { Switch} from 'react-router-dom';
import { useHistory } from "react-router-dom";
import { useState , useEffect} from 'react';
import * as firebase from 'firebase/app';
import "firebase/analytics";
import "firebase/firestore";



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
    <button class="btn btn-primary"onClick={handleClick}>
        Create Room
    </button>
  );
}

function JoinRoomIDForm() {
  const [roomId, setRoomid] = useState('');
  let history = useHistory();

  function handleChange(event) {
    setRoomid(event.target.value)
  }

  function handleSubmit(event) {
    roomExists(roomId).then(exists => {if (exists) {
      moveToRoom(roomId,history);
    } else {
      alert('Room does not exist')
    }});
    event.preventDefault();
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
      <label for="enterRoomCode">
        Room ID:
        </label>
      <input type="text" id="enterRoomCode" class="form-control" value={roomId} onChange={handleChange} placeholder="Enter a room code" />
      </div>
      <button type="submit" class="btn btn-primary">Join Room</button>
    </form>
  );
  
}

function moveToRoom(roomId, history) {
  sessionStorage.setItem('roomId',roomId);
  history.push("/"+ roomId);
}

//Generate a random ID, check there isn't already an instance of it and if not create a new room with that ID
function addNewRoom() {
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
       
        <EnterName userExists = {setUserIdExistsButWrongRoom}/>
      
      );
    } else {
      //If there is a user ID set but it is for a different room then you need to generate a new user
        if(userIdExistsButWrongRoom){
          return (
            
            <EnterName userExists = {setUserIdExistsButWrongRoom}/>
          
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

function EnterName(props) {
  const {roomId} = useParams();
  const [name, setName] = useState("");
  
  function handleChange(event) {
    setName(event.target.value);
  }
  //Triggered when the form is submitted
  function handleSubmit(event) {
    addNewUser(roomId,name).then(function(user) {
      sessionStorage.setItem('userId',user.id);
      props.userExists(false);
    });
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
            <button type="submit" disabled={!name} className="btn btn-primary">Submit</button>
          </form>
        </div>
      </div>
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

function Game() {
  var db = firebase.firestore();


  //Could create a room state which is an object that has all the room states inside it - would make passing to other components neater
  //Declare all the states used in the game
  const {roomId} = useParams();
  const [users,setUsers] = useState([]);
  const [turn, setTurn] = useState("");
  const [diceValues, setDiceValues] = useState(["","","","",""]);
  const userId = sessionStorage.getItem("userId");
  const [numOfRolls, setNumOfRolls] = useState(sessionStorage.getItem("numOfRolls")||0);
  const [diceToBeKept, setDiceToBeKept] = useState([false,false,false,false,false]);


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
    if(users.length !== 0){
    db.collection("users").doc(userId).update({ 
      score: user.score
     });
    }
  },[db,users,userId]);

  //Updates the local turn state and the database turn state
  function setNextTurn(nextUser) {
    setTurn(nextUser);
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
  function EndTurn() {

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

  return (<div className="container centre-text">
    <h1 className="roomIdTitle">
    Room ID: {roomId}
    </h1>
    <Dice diceToBeKept={diceToBeKept} setDiceToBeKept={setDiceToBeKept} rollDice={rollDice} diceValues={diceValues}  myTurn={turn === userId && numOfRolls < 3} userId={userId}/>
    <ScoreSheet diceValues={diceValues} users={users} setUsers={setUsers} userId={userId} EndTurn={EndTurn} pickScore={turn === userId && numOfRolls >= 3} turn={turn} />
    <StartGame users={users} setNextTurn={setNextTurn} setNumOfRolls={setNumOfRolls} turn={turn}/>
  </div>);
}

//Component containing all the dice - main function is to iteratively create Die
function Dice(props){
  
  return (<div>
    <div>
    <div className="row">
      {props.diceValues.map((value, index) => {
        return (
          <div className="col">
        <Die key={"Dice" + index} value={value} index={index} setDiceToBeKept={props.setDiceToBeKept} diceToBeKept={props.diceToBeKept} myTurn={props.myTurn}/>
        </div>
        );
      })}
      </div >
      </div>
      <button class="btn btn-primary mt-3 mb-3" onClick = {(event) => {props.rollDice(event,props.diceToBeKept)}} disabled={!props.myTurn}>Roll</button>
      </div>
  );
    

    
}

//Displays Die and also manages calls to set which dice to be kept
function Die(props){
  var _dice = ['https://upload.wikimedia.org/wikipedia/commons/1/1b/Dice-1-b.svg',
             'https://upload.wikimedia.org/wikipedia/commons/5/5f/Dice-2-b.svg',
             'https://upload.wikimedia.org/wikipedia/commons/b/b1/Dice-3-b.svg',
             'https://upload.wikimedia.org/wikipedia/commons/f/fd/Dice-4-b.svg',
             'https://upload.wikimedia.org/wikipedia/commons/0/08/Dice-5-b.svg',
             'https://upload.wikimedia.org/wikipedia/commons/2/26/Dice-6-b.svg'];
  return(
    
      <img className = {"dieImg " + ( props.diceToBeKept[props.index] && props.myTurn ? "glow":"" )} src={_dice[props.value]} alt = {props.value} onClick={(e) => {props.setDiceToBeKept(props.diceToBeKept.map((item, index) => 
        index === props.index 
        ? !item
        : item ))}}/>
    
  );
}

//Component displaying scoresheet
function ScoreSheet(props) {
  return (
    <table className="table table-sm w-md-50 w-lg-50 w-xl-50 mx-auto">
    <tr>
      <td>
        Name
      </td>
      <td>
        Add only Aces
      </td>
      <td>
        Add only Twos
      </td>
      <td>
        Add only Threes
      </td>
      <td>
        Add only Fours
      </td>
      <td>
        Add only Fives
      </td>
      <td>
        Add only Sixes
      </td>
      <td>
        Three Of A Kind
      </td>
      <td>
        Four Of A Kind
      </td>
      <td>
        Full House
      </td>
      <td>
        Small Straight
      </td>
      <td>
        Large Straight
      </td>
      <td>
        Yahtzee
      </td>
      <td>
        Chance
      </td>
      <td>
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
    <ScoreColumn diceValues={props.diceValues} user={user} setUsers={props.setUsers} userId={props.userId} EndTurn={props.EndTurn} pickScore={props.pickScore} turn={props.turn}/>
    );
  })}
  
</table>

  );
}


//Displays each users score in a column of the score sheet - also registers the changes in score at the end of each round
function ScoreColumn(props) {
  const setOrder = ["addOnly","threeOfAKind","fourOfAKind","fullHouse","smallStraight","largeStraight","yahtzee","chance","bonusYahtzee"];
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
    
    //TODO: Could make bonus yahtzee only be clickable if yahtzee has already been rolled
    //Checks that yahtzee has already been rolled and if so check if it has been rolled again
    function bonusYahtzee() {
      if(props.user[1].score.yahtzee === [50]){
        return yahtzee();
      } else {
        return false;
      }
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
    }
    return (
      <td class={(innerValue ==="-" && props.user[0]===props.userId && props.pickScore && key !=="bonusYahtzee") || (innerValue ==="-" && props.user[0]===props.userId && props.pickScore && key ==="bonusYahtzee" && props.user[1].score.yahtzee[0]===50)? "clickable" : ""} onClick = {(event)=>{
      if((innerValue ==="-" && props.user[0]===props.userId && props.pickScore && key !=="bonusYahtzee") || (innerValue ==="-" && props.user[0]===props.userId && props.pickScore && key ==="bonusYahtzee" && props.user[1].score.yahtzee[0]===50)){
        addScore(key,index);
        props.EndTurn();
        
      }}}>
          {(innerValue ==="-" && props.user[0]===props.userId && props.pickScore && key !=="bonusYahtzee") || (innerValue ==="-" && props.user[0]===props.userId && props.pickScore && key ==="bonusYahtzee" && props.user[1].score.yahtzee[0]===50) ? calculateScore(value,key,index)[index] :innerValue}
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

//Button which when clicked sets a random player to take the first turn
//TODO: Make this more obvious that is the first thing you have to do, maybe make it impossible to join game after it is clicked
function StartGame(props){
  const [disabled,setDisabled] = useState(false);
  
  useEffect(()=>{
    if(props.turn !== ""){
      setDisabled(true);
    }
  },[props.turn]);

  function handleClick(e) {
    props.setNextTurn(Object.keys(props.users)[Math.floor(Math.random() * Object.keys(props.users).length)]);
    setDisabled(true);
    props.setNumOfRolls(0);
    e.preventDefault(true);
  }
  return (
    <button class="btn btn-primary mb-3"onClick={handleClick} disabled={disabled}>Start Game</button>
  )
}

export default App;

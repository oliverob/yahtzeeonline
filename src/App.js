import React from 'react';
import './App.css';
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
    <div>
      <Switch>
        <Route path = "/:roomId">
          <GamePage />
        </Route>
        <Route path = "/">
          <EnterRoomIdPage />
        </Route>
      </Switch>
    </div>
  );
}

//==============================================================================
//                              Enter Room ID Page
//==============================================================================

function EnterRoomIdPage() {
  return (
    <div>
      <CreateRoomButton />
      <JoinRoomIDForm />
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
    <button onClick={handleClick}>
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
      <label>
        Room ID:
        <textarea value={roomId} onChange={handleChange} />
      </label>
      <input type="submit" value="Submit" />
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
    turn: "",
    numOfRolls:0
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
        <div>
        <EnterName userExists = {setUserIdExistsButWrongRoom}/>
      </div>
      );
    } else {
      //If there is a user ID set but it is for a different room then you need to generate a new user
        if(userIdExistsButWrongRoom){
          return (
            <div>
            <EnterName userExists = {setUserIdExistsButWrongRoom}/>
          </div>
          );
        } else {
          //If the correct Room is set and a user ID that corresponds to that room is set
          return (
            <div>
            <Game />
            </div>);
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
  return (<form onSubmit={handleSubmit}>
    <label>
      Name:
      <textarea value={name} onChange={handleChange} />
    </label>
    <input type="submit" value="Submit" />
  </form>);
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
  const {roomId} = useParams();
  const [users,setUsers] = useState([]);
  const [turn, setTurn] = useState("");
  const [diceValues, setDiceValues] = useState([0,0,0,0,0]);
  const userId = sessionStorage.getItem("userId");
  const [numOfRolls, setNumOfRolls] = useState(sessionStorage.getItem("numOfRolls")||0);
  const [diceToBeKept, setDiceToBeKept] = useState([false,false,false,false,false]);

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

  useEffect(() =>{
    sessionStorage.setItem("numOfRolls",numOfRolls);
  },[numOfRolls]);
  
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

  function rollDice(event,diceToBeKept) {
    const randomRoll = Array.from({length: 5}, () => Math.floor(Math.random() * 6));
    //Update the dice
    db.collection("rooms").doc(roomId).update({
      diceValues: diceValues.map((item, index) => 
      diceToBeKept[index]
      ? item
      : randomRoll[index]  ),
    });
    setNumOfRolls(n => parseFloat(n) + 1);
    event.preventDefault();
  }
  
  function EndTurn() {
    Object.entries(users).forEach( ([id,userData], index) =>{
      if(id === userId){
        if(index < users.length-1){
          setNextTurn(Object.keys(users)[index +1]);
        } else {
          setNextTurn(Object.keys(users)[0]);
        }
      }
    });
    setNumOfRolls(0);
    setDiceToBeKept([false,false,false,false,false]);
    //Reset the dice
    db.collection("rooms").doc(roomId).update({
      diceValues: diceValues.map((item, index) => 
      "" ),
    });
  }

  return (<div>
    <h1>
    {roomId}
    </h1>
    <Dice diceToBeKept={diceToBeKept} setDiceToBeKept={setDiceToBeKept} rollDice={rollDice} diceValues={diceValues}  myTurn={turn === userId && numOfRolls < 3} userId={userId}/>
    <ScoreSheet diceValues={diceValues} users={users} setUsers={setUsers} userId={userId} EndTurn={EndTurn} pickScore={turn === userId && numOfRolls >= 3} />
    <StartGame users={users} setNextTurn={setNextTurn} setNumOfRolls={setNumOfRolls}/>
  </div>);
}


function Dice(props){
  
  return (<div>
    <div>
      {props.diceValues.map((value, index) => {
        return (
          <div>
        <Die key={"Dice" + index} value={value}/>
        <CheckBox key={"Check" + index} index ={index} setDiceToBeKept={props.setDiceToBeKept} diceToBeKept={props.diceToBeKept}/>
        </div>);
      })}
      </div>
      <button onClick = {(event) => {props.rollDice(event,props.diceToBeKept)}} disabled={!props.myTurn}>Roll</button>
      </div>
  );
    

    
}

function Die(props){
  var _dice = ['https://upload.wikimedia.org/wikipedia/commons/1/1b/Dice-1-b.svg',
             'https://upload.wikimedia.org/wikipedia/commons/5/5f/Dice-2-b.svg',
             'https://upload.wikimedia.org/wikipedia/commons/b/b1/Dice-3-b.svg',
             'https://upload.wikimedia.org/wikipedia/commons/f/fd/Dice-4-b.svg',
             'https://upload.wikimedia.org/wikipedia/commons/0/08/Dice-5-b.svg',
             'https://upload.wikimedia.org/wikipedia/commons/2/26/Dice-6-b.svg'];
  return(
    <div>
      <img className = "dieImg" src={_dice[props.value]} alt = {props.value}/>
    </div>
  );
}

function CheckBox(props) {
  return (
    <input type="checkbox" checked={props.diceToBeKept[props.index]} onChange={(e) => {props.setDiceToBeKept(props.diceToBeKept.map((item, index) => 
      index === props.index 
      ? e.target.checked 
      : item ))}}/>
  )
}

function ScoreSheet(props) {
  return (
    <table><thead>
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
    </tr>
    </thead>
    <tbody>
    {Object.entries(props.users).map((user) => {
      return (
    <ScoreColumn diceValues={props.diceValues} user={user} setUsers={props.setUsers} userId={props.userId} EndTurn={props.EndTurn} pickScore={props.pickScore} />
    );
  })}
  </tbody>
</table>
  );
}



function ScoreColumn(props) {
  const setOrder = ["addOnly","threeOfAKind","fourOfAKind","fullHouse","smallStraight","largeStraight","yahtzee","chance","bonusYahtzee"];

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

    function sumAddOnly(total, currentValue,j,originalScores) {
      if(originalScores[j] === index) {
        return total + originalScores[j] + 1;
      } else {
        return total;
      }
    }
    
    function threeOfAKind() {
      return props.diceValues.some((dieValue)=>{
        if(props.diceValues.reduce((total,v)=>(
          v === dieValue ? total +1:total
        ))>=3){
          return true;
        } else {
          return false;
        }
      });
    }
    function fourOfAKind() {
      return props.diceValues.some((dieValue)=>{
        if(props.diceValues.reduce((total,v)=>(
          v === dieValue ? total +1:total
        ))>=4){
          return true;
        } else {
          return false;
        }
      });
    }
    function fullHouse() {
      return props.diceValues.some((dieValue)=>{
        if(props.diceValues.reduce((total,v)=>(
          v === dieValue ? total +1:total
        ))>=3){
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
  
    function smallStraight() {
      const sorted = props.diceValues.sort();
      if(JSON.stringify(sorted.slice(1))===JSON.stringify([0,1,2,3])){
        return true;
      }
      if(JSON.stringify(sorted.slice(1))===JSON.stringify([1,2,3,4])){
        return true;
      }
      if(JSON.stringify(sorted.slice(1))===JSON.stringify([2,3,4,5])){
        return true;
      }
      if(JSON.stringify(sorted.slice(0,4))===JSON.stringify([0,1,2,3])){
        return true;
      }
      if(JSON.stringify(sorted.slice(0,4))===JSON.stringify([1,2,3,4])){
        return true;
      }
      if(JSON.stringify(sorted.slice(0,4))===JSON.stringify([2,3,4,5])){
        return true;
      }
      return false;
    }

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
    function yahtzee() {
      return props.diceValues.some((dieValue)=>{
        if(props.diceValues.reduce((total,v)=>(
          v === dieValue ? total +1:total))>=5){
          return true;
        } else {
          return false;
        }
      });
    }
    function bonusYahtzee() {
      if(props.user[1].score.yahtzee === "-"){
        return false;
      } else {
        return yahtzee();
      }
    }
  }
  
  return (
<tr>
<td>

{props.user[1].name}
</td>
{ Object.entries(props.user[1].score).sort(function([a,c], [b,d]){  
  return setOrder.indexOf(a) - setOrder.indexOf(b);
}).map(([key,value])=>{
  return value.map( (innerValue,index) => {
    return (
      <td onClick = {(event)=>{
      if(props.pickScore && props.user[0]===props.userId && innerValue ==="-"){
        addScore(key,index);
        props.EndTurn();
      }}}>
          {innerValue}
      </td>
    );
})
})
}
</tr>
  );
}

//Button which when clicked sets a random player to take the first turn
function StartGame(props){
  const [disabled,setDisabled] = useState(false);
  function handleClick(e) {
    props.setNextTurn(Object.keys(props.users)[Math.floor(Math.random() * Object.keys(props.users).length)]);
    setDisabled(true);
    props.setNumOfRolls(0);
    e.preventDefault(true);
  }
  return (
    <button onClick={handleClick} disabled={disabled}>Start Game</button>
  )
}

//TODO: Bug where the numofRolls is carried across from a different game preventing it from starting
export default App;

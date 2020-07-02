import React from 'react';
import './App.css';
import { Route, useParams } from 'react-router-dom';
import { Switch} from 'react-router-dom';
import { useHistory } from "react-router-dom";
import { useState , useEffect} from 'react';
import * as firebase from 'firebase/app';
import "firebase/analytics";
import "firebase/firestore";
import Cookies from 'universal-cookie';


const cookies = new Cookies();

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
  

  function handleClick() {
    const roomId = addNewRoom();
    moveToRoom(roomId,history);
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
  cookies.set('roomId',roomId);
  history.push("/"+ roomId);
}

//Generate a random ID, check there isn't already an instance of it and if not create a new room with that ID
function addNewRoom() {
  const db = firebase.firestore();
  const roomId = getRoomId();
  db.collection("rooms").doc(roomId).set({ 
    dice: [0,0,0,0,0]
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
  const userId = cookies.get('userId');

  //Checks everytime a state is updated, if the user ID is still for the wrong room
  //This is mainly used to redirect when you first land on the page if you have the correct room ID but has to be in a useEffect loop as you have to wait for the promise to resolve which can't happen before the first render
  useEffect(() => {
    if(!(typeof(userId)==="undefined")){
    db.collection("users").doc(userId).get().then(function(doc){
      if(doc.data().roomId === roomId){
          setUserIdExistsButWrongRoom(false);
        } 
      });
    }
  }, [db,roomId,userId]);

  //Checks you have been at least intially directed here by the first page (guaranteeing that a room has been created in the database)
  if(cookies.get('roomId')===roomId){
    //Checks if the user ID has been set yet
    //If it is undefined then it hasn't been so go to Enter Name
    if(typeof(userId)==="undefined"){
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
      cookies.set('userId',user.id);
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
      addOnly: [1,2,3,4,5,6],
      threeOfAKind: 0,
      fourOfAKind: 0,
      fullHouse:0,
      smallStraight:0,
      largeStraight:0,
      yahtzee: 0,
      chance: 0,
      bonusYahtzee: [0,0,0]
    }
  });
  
}

//=================================Game=======================================

function Game() {
  const {roomId} = useParams();
  return (<div>
    <h1>
    {roomId}
    </h1>
    <Dice roomId={roomId}/>
    
  </div>);
}

function Dice(props){
  var db = firebase.firestore();
  const [retrievedDice,setRetrievedDice] = useState(false);
  const [diceValues, setDiceValues] = useState([0,0,0,0,0]);
  const [diceToBeKept, setDiceToBeKept] = useState([false,false,false,false,false]);
  
  
  //const diceValues = Array.from({length: 5}, () => Math.floor(Math.random() * 6));
  if(retrievedDice) {
  return (<div>
    <div>
      {diceValues.map((value, index) => {
        return (
          <div>
        <Die key={"Dice" + index} value={value}/>
        <CheckBox key={"Check" + index} index ={index}value={diceToBeKept[index]} setDiceToBeKept={setDiceToBeKept} diceToBeKept={diceToBeKept}/>
        </div>);
      })}
      </div>
      <button onClick = {rollDice}>Roll</button>
      </div>
  );
    }else{
      db.collection("rooms").doc(props.roomId).get().then(function(doc){
        setDiceValues(doc.data().dice);
        setRetrievedDice(true);
      });
      return null;
    }

    function rollDice() {
      const randomRoll = Array.from({length: 5}, () => Math.floor(Math.random() * 6));
      setDiceValues(diceValues.map((item, index) => 
      diceToBeKept[index]
      ? item
      : randomRoll[index]  ));
    }
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
    <input type="checkbox" checked={props.value} onChange={(e) => {props.setDiceToBeKept(props.diceToBeKept.map((item, index) => 
      index === props.index 
      ? e.target.checked 
      : item ))}}/>
  )
}

export default App;

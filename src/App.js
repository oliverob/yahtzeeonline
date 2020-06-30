import React from 'react';
import './App.css';
import { Route } from 'react-router-dom';
import { Switch} from 'react-router-dom';
import { useHistory } from "react-router-dom";
import { useState } from 'react';
import * as firebase from 'firebase/app';
import "firebase/analytics";
import "firebase/firestore";



function CreateRoomButton()  {
  let history = useHistory();
  
  function handleClick() {
    const roomId = AddNewRoom();
    addNewUser(roomId);
    history.push("/"+ roomId);
  }

  return (
    <button onClick={handleClick}>
        Create Room
    </button>
  );
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

//Generate a random ID, check there isn't already an instance of it and if not create a new room with that ID
function AddNewRoom() {
  var db = firebase.firestore();
  const roomId = getRoomId();
  db.collection("rooms").doc(roomId).set({ });
  return roomId;
}

//Add a new user with server generated unique ID, and the given room ID to the database
function addNewUser(roomId) {
  var db = firebase.firestore();
  db.collection("users").doc().set({
    roomId: roomId
  })
}

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

//Checks if a room with the given ID exists
function roomExists(roomId){
  var db = firebase.firestore();
  return db.collection("rooms").doc(roomId).get().then(function(doc) {
    return doc.exists;
  });
}

function JoinRoomIDForm() {
  const [roomId, setRoomid] = useState('');
  let history = useHistory();

  function handleChange(event) {
    setRoomid(event.target.value)
  }

  function handleSubmit(event) {
    roomExists(roomId).then(exists => {if (exists) {
      addNewUser(roomId);
      history.push("/"+ roomId);
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
function RoomIdPage() {
  return (
    <div>
      <CreateRoomButton />
      <JoinRoomIDForm />
    </div>
  );
}

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
        </Route>
        <Route path = "/">
          <RoomIdPage />
        </Route>
      </Switch>
    </div>
  );
}

export default App;

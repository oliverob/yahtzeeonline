import firebase from "firebase/app";
import "firebase/firestore";
import "firebase/analytics";


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

class Firebase {
    constructor(){
        firebase.initializeApp(firebaseConfig);
        firebase.analytics();
    }
}

export default Firebase;
import React, { useState } from "react";
import leetcatImage from '../assets/leetcat.jpeg';
import { GoogleLogin } from "@react-oauth/google";
import { jwtDecode } from "jwt-decode";

export default function Login({onLogin, onGoogleLogin}) {
  const [userName, setUserName] = useState('')
  const [password,setPassword] = useState('')
  const [userType, setUserType] = useState('student')

  const handleSubmit = (e) =>{
    e.preventDefault();

    if(userName.trim() && password.trim()){
      onLogin(userType,userName,password)
    }
    else{
      alert('Please try again')
    }

    
  }


  return (

      <div className = 'login-container'>
        <form onSubmit = {handleSubmit}>
          <div className = 'login-header'>
            <h2>Log In to Learning App</h2>
          </div>
          
              <div className ='form-group'>
                  <label className ='userType'> Login as: </label>
                  <select
                  value = {userType}
                  onChange = {(e) => setUserType(e.target.value)}
                  required
                  >
                    <option value ="student">student</option>
                    <option value ="teacher">teacher</option>
                  </select>
              </div>
          

          <div className = 'form-group'>
            <label className ='form-label'>Username</label>
            <div className = 'input-field'>
              <div className ='login-image-container'>
                <img className = 'login-image'src={leetcatImage}></img>
              </div>
              <div className ='username-input-container'>
                <input  className ='username-input'
                 placeholder ='Type your username'
                 type = "text"
                 onChange={(e) => setUserName(e.target.value)} 
                 required>
                </input>
              </div>
            </div>
          </div>

          <div className = 'form-group'>
            <label className ='form-label'>Password</label>
            <div className = 'input-field'>
              <div className ='login-image-container'>
                <img className = 'login-image'src={leetcatImage}></img>
              </div>
              <div className ='password-input-container'>
                <input  className ='password-input'
                value = {password}
                 placeholder ='Type your password'
                 type = "password"
                 onChange={(e) => setPassword(e.target.value)} 
                 required>
                </input>
              </div>
            </div>
          </div>

          <div>
            <button type= 'submit' className ='sign-in-button'>
              Sign in
            </button>
          </div>

          <div>

          <GoogleLogin 
          onSuccess = {(credentialResponse) => {
            try {
              const decoded = jwtDecode(credentialResponse.credential);
              console.log(decoded);
              if (onGoogleLogin) {
                onGoogleLogin(decoded);
              }
            } catch (error) {
              console.error("Error decoding token:", error);
            }
          }} 
          onError = {() => console.log("Login failed")} 
          />

          </div>
      
  
        </form>

      </div>
  );
}

import React, { useEffect, useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useNavigate } from "react-router-dom";
import "../styles/SignUp.css";

const SignupPage = () => {
  const {
    loginWithRedirect,
    isAuthenticated,
    isLoading,
    user,
    getAccessTokenSilently,
  } = useAuth0();
  const navigate = useNavigate();
  const [warning, setWarning] = useState("");

  useEffect(() => {
    if (isLoading) return;
    if (isAuthenticated) navigate("/dashboard");

    //handle Auth0 redirect and backend user creation
    const handleAuth = async () => {
      try {
        const token = await getAccessTokenSilently();
        await fetch("http://localhost:8000/api", {
          headers: { Authorization: `Bearer ${token}` },
        });
        //go to dashboard after successful signup/login
        //prevent user from going back to signup page
        navigate("/dashboard", { replace: true });
      } catch (err) {
        console.error("Auth0 redirect error:", err);
      }
    };

    if (isAuthenticated && user) {
      handleAuth();
    }
  }, [isAuthenticated, isLoading, user, navigate, getAccessTokenSilently]);

  //handle user sign up and redirect to signup page
  const handleSignUp = () => {
    loginWithRedirect({
      prompt: "login",
      appState: { returnTo: "/dashboard" },
    });
  };

  //redirect to signin page
  const handleSignIn = () => {
    navigate("/");
  };

  //loading message while checking Auth0 session
  if (isLoading) {
    return (
      <div className="loading-container">
        <p>Loading Auth0 session...</p>
      </div>
    );
  }

  
   return (
    <div className="signup-container">
      <div className="signup-wrapper">
        <div className="signup-left">
          <h2 className="login-title">Welcome Back!</h2>
          <p className="login-description">Would you like to continue your journey? Sign in to pick up where you left off.</p>
          <button onClick={handleSignIn} className="login-button">
            <span className="button-text">Sign in</span>
          </button>
        </div>

        <div className="signup-right">
          <img 
            src="/src/assets/logo.png" 
            alt="Logo" 
            className="logo-image"
          />
          <h1 className="signup-title">Sign up</h1>
          <div className="signup-form">
            <input 
              type="email" 
              placeholder="Email" 
              className="signup-input"
            />
            <input 
              type="password" 
              placeholder="Password" 
              className="signup-input"
            />
            <button onClick={handleSignUp} className="sign-up-button">
              <span className="button-text">Sign up</span>
            </button>
            {warning && <p className="warning-message">{warning}</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
import React, { useEffect, useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useNavigate } from "react-router-dom";
import "../styles/SignIn.css";

const LoginPage = () => {
  const {
    loginWithRedirect,
    isAuthenticated,
    error,
    isLoading,
    user,
    getAccessTokenSilently,
  } = useAuth0();
  const navigate = useNavigate();

  const [warning, setWarning] = useState("");

  //direct user to dashboard if already authenticated
  //session hasn't expired
  useEffect(() => {
    if (isAuthenticated) navigate("/dashboard");

    //handle Auth0 redirect and backend user creation
    const handleAuth = async () => {
      try {
        const token = await getAccessTokenSilently();
        await fetch("http://localhost:8000/api/", {
          headers: { Authorization: `Bearer ${token}` },
        });
        //go to dashboard after successful signup/login
        navigate("/dashboard", { replace: true });
      } catch (err) {
        console.error("Auth0 redirect error:", err);
      }
    };

    if (isAuthenticated && user) {
      handleAuth();
    }
  }, [isAuthenticated, isLoading, user, navigate, getAccessTokenSilently]);

  // handle invalid credentials
  useEffect(() => {
    if (error) {
      setWarning("Invalid email or password. Please try again.");
    }
  }, [error]);

  //handle user sign in and redirect to dashboard
  const handleSignIn = async () => {
    try {
      await loginWithRedirect({
        appState: { returnTo: "/dashboard" },
        authorizationParams: {
          redirect_uri: `${window.location.origin}/dashboard`,
          scope: "openid profile email",
        },
      });
    } catch (err) {
      console.error("Auth0 login failed:", err);
    }
  };

  const handleSignUp = async () => {
    navigate("/signup");
  };

  //handle loading state
  if (isLoading) {
    return (
      <div>
        <p>Loading Auth0 session...</p>
      </div>
    );
  }

   return (
    <div className="login-container">
      <div className="login-wrapper">
        <div className="login-left">
          <img 
            src="/src/assets/logo.png" 
            alt="Logo" 
            className="logo-image"
          />
          <h1 className="login-title">Sign in</h1>
          <div className="login-form">
            <input 
              type="email" 
              placeholder="Email" 
              className="login-input"
            />
            <input 
              type="password" 
              placeholder="Password" 
              className="login-input"
            />
            <button onClick={handleSignIn} className="sign-in-button">
              <span className="button-text">Sign in</span>
            </button>
            {warning && <p className="warning-message">{warning}</p>}
          </div>
        </div>

        <div className="login-right">
          <h2 className="signup-title">Meet your robot buddy!</h2>
          <p className="signup-description">Create your profile and start your journey with us</p>
          <button onClick={handleSignUp} className="sign-up-button">
            <span className="button-text">Sign up</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

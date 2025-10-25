import React, { useEffect, useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useNavigate } from "react-router-dom";

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
        await fetch("http://localhost:8000/auth/", {
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
        prompt: "login",
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
    <div>
      <h1>Savo</h1>
      <h2>Sign in to Savo</h2>
      {/*placeholder input fields*/}
      <input type="email" placeholder="Email" />
      <input type="password" placeholder="Password" />
      <button onClick={handleSignIn}>SIGN IN</button>
      {/*display warning message if any*/}
      <p>{warning}</p>
      {/*signup redirect option*/}
      <h2>Hello, Friend!</h2>
      <p>Create your profile and start your journey with us</p>
      <button onClick={handleSignUp}>SIGN UP</button>
    </div>
  );
};

export default LoginPage;

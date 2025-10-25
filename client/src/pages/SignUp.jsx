import React, { useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useNavigate } from "react-router-dom";

const SignupPage = () => {
  const {
    loginWithRedirect,
    isAuthenticated,
    isLoading,
    user,
    getAccessTokenSilently,
  } = useAuth0();
  const navigate = useNavigate();

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
      <div>
        <p>Loading Auth0 session...</p>
      </div>
    );
  }

  return (
    <div>
      <h1>Savo</h1>
      <h2>Sign up to Savo</h2>
      {/*placeholder input fields*/}
      <input type="email" placeholder="Email" />
      <input type="password" placeholder="Password" />
      <button onClick={handleSignUp}>SIGN UP</button>
      {/*login redirect option*/}
      <div>
        <h2>Welcome Back!</h2>
        <p>
          Would you like to continue your journey? Sign in to pick up where you
          left off.
        </p>
        <button onClick={handleSignIn}>SIGN IN</button>
      </div>
    </div>
  );
};
export default SignupPage;

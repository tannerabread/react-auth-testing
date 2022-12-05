import { useEffect, useState } from "react";
import "./App.css";
import { Auth, Hub } from "aws-amplify";
// import QRCode from "qrcode.react";

const Section = ({ children, title }) => {
  return (
    <div style={{ marginTop: 32, paddingHorizontal: 24 }}>
      <div style={{ fontSize: 24, fontWeight: "600" }}>{title}</div>
      {children}
    </div>
  );
};

function App() {
  useEffect(() => {
    listenToHub();
    Auth.currentAuthenticatedUser()
      .then((user) => setStoredUser(user))
      .catch((err) => console.log(err));
  }, []);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [phone_number, setPhoneNumber] = useState("");
  const [code, setCode] = useState("");
  const [storedUser, setStoredUser] = useState(null);
  const [totpCode, setTotpCode] = useState();
  const [challengeAnswer, setChallengeAnswer] = useState();
  const [preferredMFA, setPreferredMFA] = useState();
  const [challengeName, setChallengeName] = useState();
  const [totpChallengeAnswer, setTotpChallengeAnswer] = useState();
  const [newPassword, setNewPassword] = useState();
  const [validationData, setValidationData] = useState();
  const [newForgottenPassword, setNewForgottenPassword] = useState();
  const [forgottenPasswordCode, setForgottenPasswordCode] = useState();
  const [verificationCode, setVerificationCode] = useState();
  const [userAttributes, setUserAttributes] = useState();
  const [favoriteFlavor, setFavoriteFlavor] = useState();
  const [newEmail, setNewEmail] = useState();
  const [attributeUpdateCode, setAttributeUpdateCode] = useState();
  const [customState, setCustomState] = useState();

  async function signUp() {
    console.log(username);
    console.log(typeof username);
    console.log(password);
    console.log(email);
    console.log(phone_number);
    try {
      const { user } = await Auth.signUp({
        username,
        password,
        attributes: {
          email, // optional
          //   // phone_number, // optional - E.164 number convention
          //   // other custom attributes
          //   "custom:favorite_flavor": "Cookie Dough", // custom attribute, not standard
        },
        // autoSignIn: {
        //   // optional - enables auto sign in after user is confirmed
        //   enabled: true,
        // },
      });
      console.log(user);
    } catch (error) {
      console.log("error signing up:", error);
    }
  }

  // Sign up, Sign in & Sign out
  function listenToHub() {
    Hub.listen("auth", ({ payload }) => {
      const { event, data } = payload;
      console.log("event: ", event);
      switch (event) {
        case "signUp":
          console.log("sign up");
          console.log(data);
          break;
        case "autoSignIn":
        case "signIn":
          // assign user
          console.log(data);
          setStoredUser(data);
          break;
        case "autoSignIn_failure":
          // redirect to sign in page
          console.log("auto sign in failed");
          break;
        case "signOut":
          setStoredUser(null);
          break;
        case "customOAuthState":
          setCustomState(data);
          break;
        case "parsingCallbackUrl":
          console.log(payload);
          break;
        default:
          break;
      }
    });
  }

  async function confirmSignUp() {
    try {
      await Auth.confirmSignUp(username, code);
    } catch (error) {
      console.log("error confirming sign up", error);
    }
  }

  async function resendConfirmationCode() {
    try {
      await Auth.resendSignUp(username);
      console.log("code resent successfully");
    } catch (err) {
      console.log("error resending code: ", err);
    }
  }

  async function signIn() {
    try {
      const user = await Auth.signIn(username, password);
      setChallengeName(user.challengeName);
      if (
        user.challengeName === "SMS_MFA" ||
        user.challengeName === "SOFTWARE_TOKEN_MFA"
      ) {
        const loggedUser = await Auth.confirmSignIn(
          user,
          totpChallengeAnswer,
          challengeName
        );
        console.log(loggedUser);
        setStoredUser(loggedUser);
      } else if (user.challengeName === "NEW_PASSWORD_REQUIRED") {
        const { requiredAttributes } = user.challengeParam; // the array of required attributes, e.g ['email', 'phone_number']
        // You need to get the new password and required attributes from the UI inputs
        // and then trigger the following function with a button click
        // For example, the email and phone_number are required attributes
        const loggedUser = await Auth.completeNewPassword(
          user, // the Cognito User Object
          newPassword, // the new password
          // OPTIONAL, the required attributes
          {
            email,
            phone_number,
          }
        );
        setStoredUser(loggedUser);
      } else if (user.challengeName === "MFA_SETUP") {
        // This happens when the MFA method is TOTP
        // The user needs to setup the TOTP before using it
        // More info please check the Enabling MFA part
        setupTOTP(user);
      } else {
        // The user directly signs in
        console.log(user);
        setStoredUser(user);
      }
    } catch (error) {
      console.log("error signing in", error);
    }
  }

  async function signOut() {
    try {
      await Auth.signOut();
      setStoredUser(null);
    } catch (error) {
      console.log("error signing out: ", error);
    }
  }

  async function globalSignOut() {
    try {
      await Auth.signOut({ global: true });
      setStoredUser(null);
    } catch (error) {
      console.log("error signing out globally: ", error);
    }
  }

  // Multi-factor authentication
  async function setupTOTP(user = null) {
    user = await Auth.currentAuthenticatedUser();
    Auth.setupTOTP(user)
      .then((tempCode) => {
        console.log(tempCode);
        const str =
          "otpauth://totp/AWSCognito:" +
          username +
          "?secret=" +
          code +
          "&issuer=AWSCognito";
        // setTotpCode(<QRCode value={str} />);
        setTotpCode(tempCode);
      })
      .catch((e) => {
        console.log("error setting up TOTP: ", e);
      });
  }

  async function verifyTOTP() {
    Auth.verifyTotpToken(storedUser, challengeAnswer)
      .then(() => {
        // don't forget to set TOTP as the preferred MFA method
        Auth.setPreferredMFA(storedUser, "TOTP");
        console.log("verified TOTP");
      })
      .catch((e) => {
        // Token is not verified
        console.log("error verifying TOTP: ", e);
      });
  }

  async function setPreferredTOTP() {
    console.log("setting preferred TOTP");
    Auth.setPreferredMFA(storedUser, "TOTP")
      .then((data) => {
        console.log(data);
      })
      .catch((e) => {
        console.log("error setting preferred TOTP: ", e);
      });
  }

  async function setPreferredSMS() {
    console.log("setting preferred SMS");
    Auth.setPreferredMFA(storedUser, "SMS")
      .then((data) => {
        console.log(data);
      })
      .catch((e) => {
        console.log("error setting preferred SMS: ", e);
      });
  }

  async function setPreferredNoMFA() {
    console.log("setting preferred No MFA");
    Auth.setPreferredMFA(storedUser, "NOMFA")
      .then((data) => {
        console.log(data);
      })
      .catch((e) => {
        console.log("error setting preferred No MFA: ", e);
      });
  }

  async function getPreferred() {
    // Will retrieve the current mfa type from cache
    Auth.getPreferredMFA(storedUser, {
      // Optional, by default is false.
      // If set to true, it will get the MFA type from server side instead of from local cache.
      bypassCache: false,
    })
      .then((data) => {
        console.log("Current preferred MFA type is: " + data);
        setPreferredMFA(data);
      })
      .catch((e) => {
        console.log("error getting preferred MFA: ", e);
      });
  }

  async function customValidationData() {
    try {
      const user = await Auth.signIn({
        username, // Required, the username
        password, // Optional, the password
        validationData, // Optional, an arbitrary key-value pair map which can contain any key and will be passed to your PreAuthentication Lambda trigger as-is. It can be used to implement additional validations around authentication
      });
      console.log("user is signed in!", user);
    } catch (error) {
      console.log("error signing in:", error);
    }
  }

  // Password & User Management
  async function changePassword() {
    Auth.currentAuthenticatedUser()
      .then((user) => {
        return Auth.changePassword(user, password, newPassword);
      })
      .then((data) => console.log(data))
      .catch((err) => console.log(err));
  }

  async function forgotPassword() {
    Auth.forgotPassword(username)
      .then((data) => console.log(data))
      .catch((err) => console.log(err));
  }

  async function forgotPasswordSubmit() {
    Auth.forgotPasswordSubmit(
      username,
      forgottenPasswordCode,
      newForgottenPassword
    )
      .then((data) => console.log(data))
      .catch((err) => console.log(err));
  }

  async function verifyCurrentUser(attr) {
    Auth.verifyCurrentUserAttribute(attr)
      .then(() => {
        console.log("attribute verification code has been sent");
      })
      .catch((e) => {
        console.log("failed with error: ", e);
      });
  }

  async function verifyCurrentUserSubmit(attr) {
    Auth.verifyCurrentUserAttributeSubmit(attr, verificationCode)
      .then(() => {
        console.log(`${attr} verified`);
      })
      .catch((e) => {
        console.log("failed with error: ", e);
      });
  }

  async function retrieveCurrentUser() {
    Auth.currentAuthenticatedUser({ bypassCache: true })
      .then((user) => {
        console.log(user);
        setStoredUser(user);
        setUserAttributes(user.attributes);
      })
      .catch((err) => console.log(err));
  }

  async function refreshSession() {
    Auth.currentSession()
      .then((data) => console.log(data))
      .catch((err) => console.log(err));
  }

  async function updateUserAttributes() {
    let result = await Auth.updateUserAttributes(storedUser, {
      email: newEmail || storedUser.attributes.email,
      "custom:favorite_flavor": favoriteFlavor || "chocolate",
    });
    console.log(result);
    retrieveCurrentUser();
  }

  async function deleteUserAttributes() {
    let result = await Auth.deleteUserAttributes(storedUser, [
      "custom:favorite_flavor",
    ]);
    console.log(result);
    retrieveCurrentUser();
  }

  async function confirmAttributeCode() {
    let result = await Auth.verifyCurrentUserAttributeSubmit(
      "email",
      attributeUpdateCode
    );
    console.log(result);
  }

  async function deleteUser() {
    try {
      const result = await Auth.deleteUser();
      console.log(result);
    } catch (error) {
      console.log("Error deleting user", error);
    }
  }

  // Device Memory
  async function rememberDevice() {
    try {
      const result = await Auth.rememberDevice();
      console.log("Remembered device ", result);
    } catch (error) {
      console.log("Error remembering device", error);
    }
  }

  async function forgetDevice() {
    try {
      const result = await Auth.forgetDevice();
      console.log("Forgot device ", result);
    } catch (error) {
      console.log("Error forgetting device", error);
    }
  }

  async function fetchDevices() {
    try {
      const result = await Auth.fetchDevices();
      console.log("Devices: ", result);
    } catch (err) {
      console.log("Error fetching devices", err);
    }
  }

  return (
    <>
      <div>
        <div>
          <Section title="Sign Up">
            <input
              type="text"
              onChange={(e) => setUsername(e.target.value)}
              value={username}
              placeholder="Username"
            />
            <input
              type="text"
              onChange={(e) => setPassword(e.target.value)}
              value={password}
              placeholder="Password"
            />
            <input
              type="text"
              onChange={(e) => setEmail(e.target.value)}
              value={email}
              placeholder="Email"
            />
            <input
              type="text"
              onChange={(e) => setPhoneNumber(e.target.value)}
              value={phone_number}
              placeholder="Phone Number"
            />
            <button onClick={signUp}>Sign Up</button>
          </Section>
          <Section title="Confirm Sign Up">
            <input
              type="text"
              onChange={(e) => setCode(e.target.value)}
              value={code}
              placeholder="Confirmation Code"
            />
            <button onClick={confirmSignUp}>Confirm Sign Up</button>
            <button onClick={resendConfirmationCode}>
              Resend Confirmation
            </button>
          </Section>
          <Section title="Sign In/Out">
            <div
              style={{
                marginTop: 8,
                fontSize: 18,
                fontWeight: "400",
              }}
            >
              {storedUser ? `Signed In: ${storedUser.username}` : "Signed Out"}
            </div>
            <button onClick={signIn}>Sign In</button>
            <button onClick={signOut}>Sign Out</button>
            <button onClick={globalSignOut}>Global Sign Out</button>
          </Section>
          <Section title="Social Sign In">
            <button onClick={() => Auth.federatedSignIn()}>
              Open Hosted UI
            </button>
            <button
              onClick={() => Auth.federatedSignIn({ provider: "Google" })}
            >
              Open Google
            </button>
            <button
              onClick={() => Auth.federatedSignIn({ provider: "Facebook" })}
            >
              Open Facebook
            </button>
          </Section>
          <Section title="MFA">
            <div>{totpCode}</div>
            <button onClick={setupTOTP}>Request TOTP Code</button>
            <input
              type="text"
              onChange={(e) => setChallengeAnswer(e.target.value)}
              value={challengeAnswer}
              placeholder="TOTP Challenge Answer"
            />
            <button onClick={verifyTOTP}>Verify TOTP</button>
            <button onClick={setPreferredTOTP}>Set Preferred to TOTP</button>
            <button onClick={setPreferredSMS}>Set Preferred to SMS</button>
            <button onClick={setPreferredNoMFA}>Set Preferred to No MFA</button>
            <div>Preferred MFA: {preferredMFA || ""}</div>
            <button onClick={getPreferred}>Get Preferred MFA</button>
            <div>Challenge Name: {challengeName}</div>
            <input
              type="text"
              onChange={(e) => setTotpChallengeAnswer(e.target.value)}
              value={totpChallengeAnswer}
              placeholder="TOTP Challenge Answer"
            />
            <input
              type="text"
              onChange={(e) => setNewPassword(e.target.value)}
              value={newPassword}
              placeholder="New Password"
            />
            <button onClick={signIn}>Sign In with Challenge Answers</button>
            <input
              type="text"
              onChange={(e) => setValidationData(e.target.value)}
              value={validationData}
              placeholder="Validation Data"
            />
            <button onClick={customValidationData}>
              Sign In with Custom Validation Data
            </button>
          </Section>
          <Section title={"Password & User Management"}>
            <input
              type="text"
              onChange={(e) => setNewPassword(e.target.value)}
              value={newPassword}
              placeholder="New Password"
            />
            <button onClick={changePassword}>Change Password</button>
            <div>Forgot Password</div>
            <button onClick={forgotPassword}>Send Forgot Password Email</button>
            <input
              type="text"
              onChange={(e) => setForgottenPasswordCode(e.target.value)}
              value={forgottenPasswordCode}
              placeholder="Password Code"
            />
            <input
              type="text"
              onChange={(e) => setNewForgottenPassword(e.target.value)}
              value={newForgottenPassword}
              placeholder="Forgotten Password Code"
            />
            <button onClick={forgotPasswordSubmit}>
              Reset with New Password
            </button>
            <div>Verify User</div>
            <button onClick={() => verifyCurrentUser("phone_number")}>
              Send Phone Verification
            </button>
            <button onClick={() => verifyCurrentUser("email")}>
              Send Email Verification
            </button>
            <input
              type="text"
              onChange={(e) => setVerificationCode(e.target.value)}
              value={verificationCode}
              placeholder="Verification Code"
            />
            <button onClick={() => verifyCurrentUserSubmit("phone_number")}>
              Verify User Phone
            </button>
            <button onClick={() => verifyCurrentUserSubmit("email")}>
              Verify User Email
            </button>
            <button onClick={retrieveCurrentUser}>Retrieve User</button>
            <div>User: {storedUser && storedUser.username}</div>
            <div>Attributes: {JSON.stringify(userAttributes, null, 2)}</div>
            <button onClick={refreshSession}>Refresh Session</button>
            <input
              type="text"
              onChange={(e) => setFavoriteFlavor(e.target.value)}
              value={favoriteFlavor}
              placeholder="Favorite Flavor"
            />
            <button onClick={updateUserAttributes}>
              Update User Attributes
            </button>
            <button onClick={deleteUserAttributes}>
              Delete User Attributes
            </button>
            <div>Change Email for User</div>
            <input
              type="text"
              onChange={(e) => setNewEmail(e.target.value)}
              value={newEmail}
              placeholder="New Email"
            />
            <button onClick={updateUserAttributes}>Update Email</button>
            <input
              type="text"
              onChange={(e) => setAttributeUpdateCode(e.target.value)}
              value={attributeUpdateCode}
              placeholder="Attribute Update Code"
            />
            <button onClick={confirmAttributeCode}>Confirm Code</button>
            <button onClick={deleteUser}>Delete Current User</button>
          </Section>
          <Section title="Device Memory">
            <button onClick={rememberDevice}>Remember Device</button>
            <button onClick={forgetDevice}>Forget Device</button>
            <button onClick={fetchDevices}>Fetch Devices</button>
          </Section>
        </div>
      </div>
    </>
  );
}

export default App;

"use client";
import React, { createContext, useState, useEffect, useContext, useRef } from "react";
import AgoraRTC from "agora-rtc-sdk-ng";

// Create the context for streaming
const StreamContext = createContext();

export const StreamProvider = ({ children }) => {
  const [token, setToken] = useState("");
  const [channelName, setChannelName] = useState("");
  const [uid, setUid] = useState(null);
  const [role, setRole] = useState("viewer"); // Default role as viewer
  const [isJoined, setIsJoined] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState([]);
  const APP_ID = process.env.NEXT_PUBLIC_AGORA_APP_ID;

  // Store the Agora client in a ref
  const clientRef = useRef(null);

  // Function to fetch the token
  const fetchToken = async () => {
    if (!channelName || !uid || !role) {
      console.error("Channel name, UID, or role is missing");
      return;
    }

    try {
      const response = await fetch("http://localhost:3001/api/generate-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelName, uid, role }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const { token } = await response.json();
      console.log("Token generated:", token);
      setToken(token);
    } catch (error) {
      console.error("Failed to fetch token:", error);
    }
  };

  // Function to join the channel
  const joinChannel = async () => {
    if (!token || !channelName || !uid) {
      console.error("Token, channel name, or UID is missing");
      return;
    }

    try {
      // Initialize the Agora client instance if it's not already initialized
      if (!clientRef.current) {
        clientRef.current = AgoraRTC.createClient({ mode: "live", codec: "h264" });
      }

      // Join the channel
      await clientRef.current.join(APP_ID, channelName, token, uid);
      setIsJoined(true);

      // If the user is a host, create and publish local audio and video tracks
      if (role === "host") {
        try {
          // Create separate audio and video tracks
          const audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
          const videoTrack = await AgoraRTC.createCameraVideoTrack();

          // Publish the tracks to the channel
          await clientRef.current.publish([audioTrack, videoTrack]);

          // Save the tracks in the localStream state
          setLocalStream({ audioTrack, videoTrack });

          // Play the local video track in the DOM element with id 'local-video'
          videoTrack.play("local-video");
        } catch (error) {
          console.error("Failed to initialize local stream:", error);
        }
      }

      // Handle remote streams
      clientRef.current.on("stream-added", (event) => {
        const remoteStream = event.stream;
        clientRef.current.subscribe(remoteStream);
      });

      clientRef.current.on("stream-subscribed", (event) => {
        const remoteStream = event.stream;
        setRemoteStreams((prev) => [...prev, remoteStream]);
      });

      clientRef.current.on("stream-removed", (event) => {
        const remoteStream = event.stream;
        setRemoteStreams((prev) =>
          prev.filter((stream) => stream.getId() !== remoteStream.getId())
        );
        remoteStream.close();
      });
    } catch (error) {
      console.error("Failed to join channel:", error);
    }
  };

  // Function to leave the channel
  const leaveChannel = async () => {
    try {
      if (localStream) {
        localStream.audioTrack?.stop();
        localStream.videoTrack?.stop();
        setLocalStream(null);
      }

      // Stop all remote streams
      remoteStreams.forEach((stream) => {
        stream.videoTrack?.stop();
        stream.audioTrack?.stop();
      });
      setRemoteStreams([]);

      // Leave the channel
      await clientRef.current.leave();
      setIsJoined(false);
    } catch (error) {
      console.error("Failed to leave channel:", error);
    }
  };

  // Cleanup function on component unmount
  useEffect(() => {
    return () => {
      if (localStream) {
        localStream.audioTrack?.stop();
        localStream.videoTrack?.stop();
        setLocalStream(null);
      }

      remoteStreams.forEach((stream) => {
        stream.videoTrack?.stop();
        stream.audioTrack?.stop();
      });
      setRemoteStreams([]);

      if (clientRef.current) {
        clientRef.current.leave();
      }
    };
  }, [localStream, remoteStreams]);

  // Handle remote stream display
  useEffect(() => {
    remoteStreams.forEach((stream) => {
      const containerId = `remote-video-${stream.getId()}`;
      const container = document.getElementById(containerId);
      if (container && !container.children.length) {
        stream.play(containerId);
      }
    });
  }, [remoteStreams]);

  return (
    <StreamContext.Provider
      value={{
        token,
        setToken,
        channelName,
        setChannelName,
        uid,
        setUid,
        role,
        setRole,
        isJoined,
        setIsJoined,
        localStream,
        setLocalStream,
        remoteStreams,
        setRemoteStreams,
        fetchToken,
        joinChannel,
        leaveChannel,
      }}
    >
      {children}
    </StreamContext.Provider>
  );
};

// Custom hook to use stream context
export const useStream = () => useContext(StreamContext);

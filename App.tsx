import { TextInput, TouchableOpacity,Dimensions , Alert, NativeEventEmitter, NativeModules } from "react-native";
import * as Clipboard from "expo-clipboard";
import * as FileSystem from "expo-file-system";
import * as MediaLibrary from "expo-media-library";
import { MMKVLoader, useMMKVStorage } from 'react-native-mmkv-storage';
import { encode } from "base64-arraybuffer";
import React, { useEffect } from "react";
import { ShareIntentProvider, useShareIntentContext } from "expo-share-intent";
import { View, Text } from "react-native";
import { useState } from "react";
// import { Button } from "react-native";

import { StatusBar } from 'expo-status-bar';

import { Button, IconButton } from "react-native-paper";
import Animated, { useSharedValue, withTiming,runOnJS } from "react-native-reanimated";


const storage = new MMKVLoader().initialize();

const { width } = Dimensions.get("window");

const Home = () => {
  const { hasShareIntent, shareIntent, resetShareIntent, error } = useShareIntentContext();
  const [link, setLink] = useState("");
  const [serverLink, setServerLink] = useMMKVStorage('serverLink', storage, 'http://10.46.77.173:10000/download');
  const [isEditing, setIsEditing] = useState(false);
  const inputWidth = useSharedValue(50);
  const translateX = useSharedValue(0); 
  const opacity = useSharedValue(1);

  const toggleInput = () => {
    // console.log(width);
    if (isEditing) {
      opacity.value = withTiming(0, { duration: 150 }, () => {
        runOnJS(setIsEditing)(false); // Hides input only after fade-out
      });
      inputWidth.value = withTiming(50, { duration: 300 });
      translateX.value = withTiming(isEditing ? 1 : width - 70, { duration: 300 });
    } else {
      setIsEditing(true);
      opacity.value = 1; // Show input before expanding
      inputWidth.value = withTiming(width - 100, { duration: 300 });
      translateX.value = withTiming(20, { duration: 300 });
    }
  };


  useEffect(() => {
    if (hasShareIntent) {
      console.log("Received share intent:", shareIntent?.text);
      setLink(shareIntent?.text ?? "");
      // resetShareIntent();
      console.log("Server Link....: "+serverLink);
    }
  }, [hasShareIntent]);

  const pasteFromClipboard = async () => {
    const clipboardContent = await Clipboard.getStringAsync();
    setLink(clipboardContent);
  };

  const sanitizeFilename = (filename: string): string => {
    return filename.replace(/[^a-zA-Z0-9._-]/g, "_"); // Replace invalid characters with "_"
  };

  const fetchVideo = async () => {
    if (!link) {
      Alert.alert("Error", "Please enter a valid link.");
      return;
    }
      try {
        const res = await fetch("http://10.46.77.173:10000/download", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: link }),
        });
  
        if (!res.ok) {
            throw new Error("Failed to fetch video");
        }
  
        const contentDisposition = res.headers.get("content-disposition");
        let filename = "video.mp4";
  
        if (contentDisposition) {
            const match = contentDisposition.match(/filename="?([^";]+)"?/);
            if (match) filename = match[1];
        }
  
        filename = sanitizeFilename(filename); // Sanitize filename
        const fileUri = `${FileSystem.documentDirectory}${filename}`;
  
        // Convert response to base64
        const arrayBuffer = await res.arrayBuffer();
        const base64 = encode(arrayBuffer);
  
        await FileSystem.writeAsStringAsync(fileUri, base64, {
            encoding: FileSystem.EncodingType.Base64,
        });
  
        // Request Media Library Permissions
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status !== "granted") {
            throw new Error("Permission to access media library is required.");
        }
  
        // Save video to gallery
        const asset = await MediaLibrary.createAssetAsync(fileUri);
        await MediaLibrary.createAlbumAsync("Download", asset, false);
  
        Alert.alert("Download Complete", "Video saved to gallery!");
  
        // if (await Sharing.isAvailableAsync()) {
        //     await Sharing.shareAsync(fileUri);
        // }
  
      } catch (error) {
        Alert.alert("Error", error instanceof Error ? error.message : "An unknown error occurred");
      }
  };

  return (
    // <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 20 }}>
    //   <Text style={{ fontSize: 20, marginBottom: 10 }}>Enter Video Link:</Text>
    //   <View style={{ flexDirection: "row", alignItems: "center", width: "100%" }}>
    //     <TextInput
    //       style={{ flex: 1, borderWidth: 1, padding: 10, borderRadius: 5 }}
    //       value={link}
    //       onChangeText={setLink}
    //       placeholder="Paste the link here"
    //     />
    //     <TouchableOpacity onPress={pasteFromClipboard} style={{ marginLeft: 10, padding: 10, backgroundColor: "#ccc", borderRadius: 5 }}>
    //       <Text>Paste</Text>
    //     </TouchableOpacity>
    //   </View>
    //   <View style={{ marginTop: 10 }}>
    //     <Button title="Download" onPress={fetchVideo} />
    //   </View>
    // </View>



    <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: 20, backgroundColor: "#121212" }}>
      {/* Static Input Field */}
      <Text style={{ fontSize: 20, color: "#fff", marginBottom: 10 }}>Enter Video Link:</Text>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
    <TextInput
      style={{
        color: "white",
        fontSize: 16,
        backgroundColor: "#1e1e1e",
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 8,
        flex: 1,
        paddingRight: 50, 
        height: 40,
      }}
      value={link}
      onChangeText={setLink}
      placeholder="Paste the link here"
      placeholderTextColor="#888"
    />
    <TouchableOpacity
      onPress={pasteFromClipboard}
      style={{
        position: "absolute",
        right: 0,
        top: 12,
        transform: [{ translateY: -12 }],
        backgroundColor: "#333",
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 8,
        height: 40,
      }}
    >
      <Text style={{ color: "#fff", fontSize: 14 }}>Paste</Text>
    </TouchableOpacity>
  </View>
      {/* Floating Animated Input */}
      <Animated.View
        style={{
          flexDirection: "row",
          alignItems: "center",
          position: "absolute",
          right: 20,
          top: 30,
          transform: [{ translateX }],
        }}
      >
        {isEditing ? (
          <Animated.View
            style={{
              width: inputWidth,
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: "#1e1e1e",
              borderRadius: 10,
              paddingHorizontal: 10,
              opacity,
            }}
          >
            <TextInput
              style={{ color: "white", fontSize: 16, flex: 1, paddingVertical: 8 }}
              value={serverLink}
              onChangeText={setServerLink}
              placeholder="Paste the link"
              placeholderTextColor="#888"
            />
            <IconButton icon="check" size={24} iconColor="green" onPress={toggleInput} />
          </Animated.View>
        ) : (
          <IconButton icon="link" size={28} iconColor="white" onPress={toggleInput} />
        )}
      </Animated.View>

      {/* Download Button */}
      <Button mode="contained" style={{ marginTop: 20, backgroundColor: "#1DB954" , width: 150, alignSelf: "center"}} onPress={fetchVideo}>
        Download
      </Button>
      <StatusBar style="light" />
    </View>
  );
};

export default function App() {
  return (
    <ShareIntentProvider>
      <Home />
    </ShareIntentProvider>
  );
}

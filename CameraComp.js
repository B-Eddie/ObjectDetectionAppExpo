import React, { useState, useEffect } from "react";
import { Text, View, Button, StyleSheet } from "react-native";
import { Camera } from "expo-camera";

const CameraComp = ({ navigation }) => {
    const [type, setType] = useState(null); // Initialize type as null
    const [permission, setPermission] = useState(null);

    useEffect(() => {
        (async () => {
            const { status } = await Camera.requestPermissionsAsync();
            setPermission(status === "granted");
            setType(Camera.Constants.Type.back); // Set the initial type to back
        })();
    }, []);

    const toggleCameraType = () => {
        setType((current) =>
            current === Camera.Constants.Type.back
                ? Camera.Constants.Type.front
                : Camera.Constants.Type.back
        );
    };

    return (
        <View>
            <Text>Camera Comp {type}</Text>
            {permission && <Camera style={styles.camera} type={type} />}
            <Button
                title="Grant Permission"
                onPress={async () => {
                    const { status } = await Camera.requestPermissionsAsync();
                    setPermission(status === "granted");
                }}
            />
            <Button
                title="Flip Camera"
                onPress={toggleCameraType}
                disabled={!permission}
            />
            <Button title="Go to Home" onPress={() => navigation.push("Home")} />
        </View>
    );
};

const styles = StyleSheet.create({
    camera: {
        width: "100%",
        height: 350,
    },
});

export default CameraComp;

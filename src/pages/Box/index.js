import React, { Component } from 'react';

import { View, Text, FlatList, TouchableOpacity } from 'react-native';

import styles from './styles';
import AsyncStorage from "@react-native-community/async-storage";
import api from '../../services/api';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { distanceInWords } from 'date-fns';
import pt from 'date-fns/locale/pt';
import ImagePicker from 'react-native-image-picker';
import RNFS from 'react-native-fs';
import FileViewer from 'react-native-file-viewer';
import socket from 'socket.io-client';

export default class Box extends Component {
  state = {
    box : {}
  }
  
  async componentDidMount(){
    const box =  await AsyncStorage.getItem('@RocketBox:box');//'5caf9debbab293000492adf0'//
    this.subscribeToNewFiles(box);
    const response = await api.get(`boxes/${box}`);

    this.setState({box : response.data});
  }

  subscribeToNewFiles = (box) => {
    const io = socket('https://omnistack-maicon.herokuapp.com');
  
    io.emit('connectRoom', box);
  
    io.on('file', data => {
      this.setState({ box:  { ...this.state.box, files: [data, ...this.state.box.files] } });
    });
  }

  renderItem = ({ item }) => (
    <TouchableOpacity
      onPress={() => this.openFile(item) }
      style={styles.file}
    >
      <View style={styles.fileInfo}>
        <Icon name="insert-drive-file" size={24} color="#a5cfff" />
        <Text style={styles.fileTitle}>{item.title}</Text>
      </View>  

      <Text style={styles.fileDate}>há {distanceInWords(item.createdAt, new Date(), {locale: pt})}</Text>
    </TouchableOpacity>

    );

    handleUpload = () => {
      ImagePicker.launchImageLibrary({}, async upload => {
        if(upload.error){
          console.log('image pick error');
        } else if (upload.didCancel){
          console.log('canceled by user');
        } else {
          const data = new FormData();
          
          const [prefix, suffix] = upload.fileName.split('.');
          const ext = suffix.toLowerCase() === 'heic' ? 'jpg' : suffix;


          data.append('file', {
            uri: upload.uri,
            type: upload.type,
            name: `${prefix}.${ext}`
          });

          const response = api.post(`/boxes/${this.state.box._id}/files`, data);
          
        }
      });
    }

    openFile = async file => {
      try {
        const filePath = `${RNFS.DocumentDirectoryPath}/${file.title}`

        await RNFS.downloadFile({
          fromUrl: file.url,
          toFile: filePath,
        });

        await FileViewer.open(filePath);
      } catch (err) {
        console.log(err);
      }
    }
  
  render() {
    return (
      <View style={styles.container}>
        <Text style={styles.boxTitle}>{this.state.box.title}</Text>

        <FlatList 
          style={styles.list}
          data={this.state.box.files}
          keyExtractor={file => file._id}
          ItemSeparatorComponent={() => ( <View style={styles.separator} />)}
          renderItem={this.renderItem}
        />

        <TouchableOpacity style={styles.fab} onPress={this.handleUpload}>
          <Icon name="cloud-upload" size ={24} color="#fff" />
        </TouchableOpacity>
      </View>
    );
  }
}
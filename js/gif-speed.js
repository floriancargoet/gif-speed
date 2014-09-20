$(function onDOMReady() {
  var $preview = $('#preview');
  var $img     = $('#preview #gif');

  gif = new GIF($img[0]);

  $('#local-file').on('change', function onInputChange(ev) {
      var file = ev.target.files[0];
      $img.attr('src', '');
      $preview.addClass('loading');
      gif.loadFile(file, function () {
        $preview.removeClass('loading');
        console.log(file.name + ' loaded.');
      });
  });

  $('#remote-file-button').on('click', function onRemoteClick(ev) {
      var url = $('#remote-file').val();
      $img.attr('src', '');
      $preview.addClass('loading');
      gif.loadURL(url, function () {
        $preview.removeClass('loading');
        console.log(url + ' loaded.');
      });
  });
});


function GIF(img) {
  this.image = img; // if provided, will automatically be updated
}

GIF.prototype.loadFile = function loadFile(file, callback) {
  var reader = new FileReader();
  var self = this;
  reader.onload = function onReaderLoad(event) {
    self.setBuffer(event.target.result);
    callback();
  }
  reader.readAsArrayBuffer(file);
};

GIF.prototype.loadURL = function loadURL(url, callback) {
  var self = this;
  bufferXHR(url, function (err, buffer) {
    if (err) throw err;

    self.setBuffer(buffer);
    callback();
  });
};

GIF.prototype.setBuffer = function setBuffer(buffer) {
  this.buffer   = buffer;
  this.metadata = gify.getInfo(buffer);
  this.view     = this.metadata.view;
  this.updateImage();
};

GIF.prototype.makeURL = function makeURL() {
  var blob = new Blob([this.buffer], { "type" : "image/gif" });
  var blobURL = (window.URL || window.webkitURL).createObjectURL(blob);
  return blobURL;
};

GIF.prototype.setUInt16Delay = function setUInt16Delay(delay) {
  var view = gif.metadata.view;
  gif.metadata.images.forEach(function (i) {
    // directly modify the delay time bytes
    view.setUint16(i.delayByteOffset, delay, true);
  });
  this.updateImage();
};

GIF.prototype.getDelayMS = function getDelayMS() {
  return this.metadata.images[0].delay;
}

GIF.prototype.setDelayMS = function setDelayMS(delayMS) {
  if (delayMS < 0 || delayMS > 655350) {
    throw new Error("Delay must be between 0 and 655350");
  }
  var delay = delayMS / 10;
  if (delay !== Math.round(delay)) {
    delay = Math.round(delay);
    console.info('Delay rounded to ' + 10 * delay + ' ms.');
  }
  this.setUInt16Delay(delay);
};

GIF.prototype.updateImage = function updateImage(image) {
  image = image || this.image;
  if (image) {
    image.src = this.makeURL();
  }
};


function bufferXHR(url, callback) {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', url, true);

  // new browsers (XMLHttpRequest2-compliant)
  if ('responseType' in xhr) {
    xhr.responseType = 'arraybuffer';
  }
  // old browsers (XMLHttpRequest-compliant)
  else if ('overrideMimeType' in xhr) {
    xhr.overrideMimeType('text/plain; charset=x-user-defined');
  }
  // IE9 (Microsoft.XMLHTTP-compliant)
  else {
    xhr.setRequestHeader('Accept-Charset', 'x-user-defined');
  }

  // shim for onload for old IE
  if (!('onload' in xhr)) {
    xhr.onreadystatechange = function () {
      if (this.readyState === 4) {
        this.onload();
      }
    };
  }

  var cbError = function (string) {
    callback(new Error(string));
  };

  xhr.onload = function () {
    if (this.status !== 0 && this.status !== 200) {
      return cbError('HTTP Error #' + this.status + ': ' + this.statusText);
    }

    // emulating response field for IE9
    if (!('response' in this)) {
      this.response = new VBArray(this.responseBody).toArray();
    }

    callback(null, this.response);
  };

  xhr.onerror = function () {
    cbError('Network error.');
  };

  xhr.send(null);
}
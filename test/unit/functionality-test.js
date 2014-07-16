var riak = require('./../../lib')();
var assert = require('assert');

var bucket = 'test';
var json = {
  id: '1',
  t: 1
};
var err = null;

afterEach(function(done) {
  assert.equal(err, null);
  done();
});

it('Store json and get it', function(done){
  riak.save(bucket, json.id, json, function(e, result, meta){
    err = e;
    assert.equal(result, undefined);
    riak.get('test', json.id, function(e, result, meta){
      assert.equal(e, null);
      assert.deepEqual(result, json);
      done();
    });
  });
});

/*it('Authorization header', function(){
  assert.equal(true, false, 'not tested');
});*/

it('Get head test', function(done){
  this.timeout(1000);
  riak.head(bucket, json.id, function(e, result, meta){
    err = e;
    assert.equal(result, undefined);

    assert.equal(meta.contentType, 'application/json');
    assert.equal(meta.contentLength, JSON.stringify(json).length);

    done();
  });
});

describe('.exists', function(){
  this.timeout(1000);

  it('should exists', function(done){
    riak.exists(bucket, json.id, function(e, r, m){
      err = e;
      assert.equal(r, true);
      done();
    });
  });

  it('should not exist', function(done){
    riak.exists(bucket, 'AIR_FRIGGIN_MADRID', function(e, r, m){
      err = e;
      assert.equal(r, false);
      done();
    });
  });
});

it('.getAll', function(done){
  riak.getAll(bucket, function(e,r,m){
    err = e;
    assert.equal(r.length>0, true);
    done();
  });
});


it('.buckets', function(done){
  riak.buckets(function(e,r,m){
    err = e;
    assert.equal(r.length>0, true);
    assert.equal(-1!= r.indexOf(bucket), true);
    done();
  });
});

describe('.keys', function(){
  it('if bucket exists', function(done){
    riak.keys(bucket, function(e,r,m){
      console.log(arguments);
      err = e;
      assert.equal(r.length>0, true);
      assert.equal(-1!=r.indexOf(json.id), true);
      done();
    });
  });
});

/*describe('...', function(){
  this.timeout(1000);

  it('...', function(done){
    setTimeout(done, 1001);
  });
});*/


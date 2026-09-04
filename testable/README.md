# Testable
Custom tool to test ThreeJS components in isolated environment.

### How to use
1. Create file with extension `.testable.ts`
2. Import class you want to test.
3. Use `@Testable` decorator above your class extension:
```
@Testable({
  path: '/components/YourMeshName',
  useOrbitControls: true,
  useFbnBackground: true
})
export class YourNameTestable extends YourMeshName {}
```
4. Make sure your docker is running.
5. Run `mise run docker-up-test` in the project root, or just `mise run docker-up` to run both Testable and actual project.
6. In the browser go to `localhost:3001/components/YourMeshName`
7. That's all, your node is here :)

### Adding controls
Sometimes you may need to add additional controls to the mesh to play with its rotation, uniforms, or other types of interactions.
That's what `@Expose` decorator is made for.

Inside your `@Testable` class create `@Exposed` property just like this:
```
  @Expose({ min: 0, max: Math.PI * 2, step: 0.01, folder: 'Rotation', target: 'rotation.y' })
  public _rotationY!: number;
```
Target is supposed to be an actual property of your inherited class.
In case you need to play with more than just a singular property, you can use getter and setter like this:
```
  private _speed = 1;
  @Expose({ min: 0.1, max: 5, step: 0.1, folder: 'Animation' })
  public get speed() { return this._speed; }
  public set speed(value: number) {
    this._speed = value;
    this.timeline.timeScale(value);
  }
```
All exposed properties should be available from GUI inside your testable route.